import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { freepayAuthHeader } from '@/lib/site-freepay'

export const Route = createFileRoute('/api/public/payment-status')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Max-Age': '86400',
          },
        }),
      GET: async ({ request }) => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json',
        }
        try {
          const url = new URL(request.url)
          const transactionId = url.searchParams.get('transaction_id')
          if (!transactionId) {
            return new Response(JSON.stringify({ error: 'transaction_id required' }), { status: 400, headers: corsHeaders })
          }
          const supabase = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
          const { data, error } = await supabase
            .from('payment_transactions')
            .select('status, amount, customer_name, customer_email, customer_cpf, customer_phone, customer_ip, tracking_json, items_json, gateway')
            .eq('transaction_id', String(transactionId))
            .maybeSingle()
          if (error) {
            return new Response(JSON.stringify({ error: 'db error' }), { status: 500, headers: corsHeaders })
          }

          if (data?.status === 'paid') {
            return new Response(JSON.stringify({ status: 'paid' }), { status: 200, headers: corsHeaders })
          }

          const { resolveGateway, getLegacyStatus } = await import('@/lib/legacy-gateway.server')
          let rawStatus = ''
          let tx: any = {}
          // Upsells sao sempre gerados na FreePay
          const forcedGateway = url.searchParams.get('gateway')
          // IMPORTANTE: com mesclagem ativa, resolveGateway() alterna a cada pedido.
          // O status precisa ser consultado no gateway em que a transacao foi criada.
          const storedGateway = data?.gateway === 'legacy' ? 'legacy' : data?.gateway === 'freepay' ? 'freepay' : null
          const gateway = storedGateway
            ?? (forcedGateway === 'freepay' ? 'freepay' : forcedGateway === 'legacy' ? 'legacy' : await resolveGateway())
          if (gateway === 'legacy') {
            rawStatus = (await getLegacyStatus(String(transactionId))) === 'APPROVED' ? 'paid' : 'pending'
          } else {
            const gatewayResp = await fetch(`https://api.freepaybrasil.com/v1/payment-transaction/${encodeURIComponent(transactionId)}`, {
              headers: { Accept: 'application/json', Authorization: freepayAuthHeader() },
            })
            const gatewayData: any = await gatewayResp.json().catch(() => ({}))
            tx = gatewayData?.data || gatewayData
            rawStatus = String(tx?.Status || tx?.status || '').toLowerCase()
          }


          if (['paid', 'approved', 'completed'].includes(rawStatus)) {
            await supabase
              .from('payment_transactions')
              .update({ status: 'paid', updated_at: new Date().toISOString() })
              .eq('transaction_id', String(transactionId))

            // Facebook Conversions API - Purchase (somente pedidos pagos)
            try {
              const tracking: any = (data?.tracking_json as any) || {}
              const amountCents = Number(data?.amount) || Number(tx?.Amount || tx?.amount || 0)
              const { sendFbPurchase } = await import('@/lib/fb-capi.server')
              await sendFbPurchase({
                eventId: String(transactionId),
                value: amountCents / 100,
                currency: 'BRL',
                eventSourceUrl: tracking.event_source_url || undefined,
                customer: {
                  name: data?.customer_name || undefined,
                  email: data?.customer_email || undefined,
                  phone: data?.customer_phone || undefined,
                  cpf: data?.customer_cpf || undefined,
                  ip: data?.customer_ip || undefined,
                  userAgent: tracking.user_agent || undefined,
                },
                fbp: tracking.fbp || undefined,
                fbc: tracking.fbc || undefined,
                externalId: data?.customer_cpf || undefined,
              })
            } catch (e) { console.error('[fb-capi] status notify failed', e) }

            // Utmify - atualiza pedido para pago (fallback se o webhook nao chegar)
            try {
              const tracking: any = (data?.tracking_json as any) || {}
              const amountCents = Number(data?.amount) || Number(tx?.Amount || tx?.amount || 0)
              const { sendUtmifyOrder } = await import('@/lib/utmify.server')
              await sendUtmifyOrder({
                orderId: String(transactionId),
                status: 'paid',
                amountCents,
                platform: gateway === 'legacy' ? 'Legacy' : 'FreePay',
                customer: {
                  name: data?.customer_name || 'Cliente',
                  email: data?.customer_email || 'cliente@gmail.com',
                  document: data?.customer_cpf || undefined,
                  phone: data?.customer_phone || undefined,
                  ip: data?.customer_ip || undefined,
                },
                product: (() => {
                  const item = Array.isArray(data?.items_json) ? (data?.items_json as any[])[0] : null
                  return {
                    id: item?.name || 'produto',
                    name: item?.name || 'Produto',
                    quantity: item?.quantity || 1,
                    priceCents: amountCents,
                  }
                })(),
                trackingParameters: tracking,
              })
            } catch (e) { console.error('[utmify] status notify failed', e) }



            try {
              const amount = Number(data?.amount) || Number(tx?.Amount || tx?.amount || 0)
              const { sendPushcut } = await import('@/lib/pushcut.server')
              await sendPushcut('Pedido pago', `✅ R$ ${(amount / 100).toFixed(2).replace('.', ',')}`)
            } catch (e) { console.error('[pushcut] status notify failed', e) }


            return new Response(JSON.stringify({ status: 'paid' }), { status: 200, headers: corsHeaders })
          }

          return new Response(JSON.stringify({ status: data?.status ?? 'pending' }), { status: 200, headers: corsHeaders })
        } catch (e) {
          return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: corsHeaders })
        }
      },
    },
  },
})
