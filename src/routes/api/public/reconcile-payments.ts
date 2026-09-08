import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { freepayAuthHeader } from '@/lib/site-freepay'

// Reconciliacao de pagamentos: varre transacoes pendentes recentes, consulta o
// gateway CORRETO (o que foi gravado na transacao) e, se estiver pago, marca no
// banco e dispara Utmify / Facebook / Pushcut.
// GET /api/public/reconcile-payments?hours=72
export const Route = createFileRoute('/api/public/reconcile-payments')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        const url = new URL(request.url)
        const hours = Math.min(Number(url.searchParams.get('hours') || 72) || 72, 720)
        const since = new Date(Date.now() - hours * 3600_000).toISOString()

        const supabase = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
        const { data: rows, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('status', 'pending')
          .gte('created_at', since)
          .limit(300)

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })

        const { getLegacyStatus } = await import('@/lib/legacy-gateway.server')
        const { sendUtmifyOrder } = await import('@/lib/utmify.server')
        const results: any[] = []

        for (const tx of rows || []) {
          const gateway = tx.gateway === 'legacy' ? 'legacy' : 'freepay'
          let paid = false
          try {
            if (gateway === 'legacy') {
              paid = (await getLegacyStatus(String(tx.transaction_id))) === 'APPROVED'
            } else {
              const resp = await fetch(
                `https://api.freepaybrasil.com/v1/payment-transaction/${encodeURIComponent(String(tx.transaction_id))}`,
                { headers: { Accept: 'application/json', Authorization: freepayAuthHeader() } }
              )
              const j: any = await resp.json().catch(() => ({}))
              const t = j?.data || j
              paid = ['paid', 'approved', 'completed'].includes(String(t?.Status || t?.status || '').toLowerCase())
            }
          } catch (e) {
            results.push({ id: tx.transaction_id, error: String(e) })
            continue
          }

          if (!paid) continue

          await supabase
            .from('payment_transactions')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('transaction_id', tx.transaction_id)

          const amountCents = Number(tx.amount) || 0
          const item = Array.isArray(tx.items_json) ? (tx.items_json as any[])[0] : null
          const tracking: any = (tx.tracking_json as any) || {}

          try {
            await sendUtmifyOrder({
              orderId: String(tx.transaction_id),
              status: 'paid',
              amountCents,
              platform: gateway === 'legacy' ? 'Legacy' : 'FreePay',
              customer: {
                name: tx.customer_name || 'Cliente',
                email: tx.customer_email || 'cliente@gmail.com',
                document: tx.customer_cpf || undefined,
                phone: tx.customer_phone || undefined,
                ip: tx.customer_ip || undefined,
              },
              product: {
                id: item?.name || 'produto',
                name: item?.name || 'Produto',
                quantity: item?.quantity || 1,
                priceCents: amountCents,
              },
              trackingParameters: tracking,
            })
          } catch (e) { console.error('[reconcile][utmify]', e) }

          try {
            const { sendFbPurchase } = await import('@/lib/fb-capi.server')
            await sendFbPurchase({
              eventId: String(tx.transaction_id),
              value: amountCents / 100,
              currency: 'BRL',
              eventSourceUrl: tracking.event_source_url || undefined,
              customer: {
                name: tx.customer_name || undefined,
                email: tx.customer_email || undefined,
                phone: tx.customer_phone || undefined,
                cpf: tx.customer_cpf || undefined,
                ip: tx.customer_ip || undefined,
                userAgent: tracking.user_agent || undefined,
              },
              fbp: tracking.fbp || undefined,
              fbc: tracking.fbc || undefined,
              externalId: tx.customer_cpf || undefined,
            })
          } catch (e) { console.error('[reconcile][fb]', e) }

          try {
            const { sendPushcut, brl } = await import('@/lib/pushcut.server')
            await sendPushcut('OFERTA ML', `VENDA PAGA ${brl(amountCents)}`)
          } catch (e) { console.error('[reconcile][pushcut]', e) }

          results.push({ id: tx.transaction_id, gateway, marked: 'paid' })
        }

        return new Response(JSON.stringify({ scanned: rows?.length || 0, updated: results.length, results }), { status: 200, headers })
      },
    },
  },
})
