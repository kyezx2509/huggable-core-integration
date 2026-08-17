import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

function pickId(b: any): string {
  return String(
    b?.Id ||
    b?.data?.id ||
    b?.data?.Id ||
    b?.data?.transaction_id ||
    b?.data?.hash ||
    b?.transaction?.id ||
    b?.transaction?.Id ||
    b?.transaction_id ||
    b?.id ||
    b?.hash ||
    ''
  )
}
function pickStatus(b: any): string {
  return String(
    b?.Status ||
    b?.data?.status ||
    b?.data?.Status ||
    b?.transaction?.status ||
    b?.transaction?.Status ||
    b?.status ||
    b?.event ||
    ''
  ).toLowerCase()
}
function pickAmount(b: any): number {
  return Number(b?.Amount || b?.data?.Amount || b?.data?.amount || b?.transaction?.Amount || b?.transaction?.amount || b?.amount || 0)
}
function pickName(b: any): string {
  return String(
    b?.Customer?.Name ||
    b?.data?.customer?.name ||
    b?.data?.Customer?.Name ||
    b?.transaction?.customer?.name ||
    b?.transaction?.Customer?.Name ||
    b?.customer?.name ||
    'Cliente'
  )
}

function formatAmountBRL(amount: number, fallbackCents?: number | null) {
  const value = amount > 0 ? (amount >= 1000 ? amount / 100 : amount) : Number(fallbackCents || 0) / 100
  return value.toFixed(2).replace('.', ',')
}

async function processWebhook(rawBody: string) {
  let body: any = {}
  try { body = JSON.parse(rawBody) } catch { /* form or empty */ }

  const transactionId = pickId(body)
  const statusRaw = pickStatus(body)
  console.log('[freepay-webhook] tx:', transactionId, 'status:', statusRaw, 'body:', rawBody.slice(0, 400))

  // A FreePay envia campos em PascalCase (Id, Status, Amount). Sempre responder 200
  // evita que a FreePay pare de reenviar eventos pagos por causa de um payload inicial incompleto.
  if (!transactionId) return { code: 200, msg: 'no id' }

  const isPaid = ['paid', 'approved', 'completed', 'transaction.paid', 'transaction_paid'].some(s => statusRaw.includes(s))
  const isRefused = ['refused', 'failed', 'canceled', 'cancelled', 'refunded', 'chargedback'].some(s => statusRaw.includes(s))
  const mapped = isPaid ? 'paid' : isRefused ? 'refused' : 'pending'

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing } = await supabase
    .from('payment_transactions')
    .select('status, amount, customer_name, customer_email, customer_cpf, customer_phone, customer_ip, items_json, tracking_json')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  const wasAlreadyPaid = existing?.status === 'paid'
  const { error } = await supabase
    .from('payment_transactions')
    .update({ status: mapped, updated_at: new Date().toISOString() })
    .eq('transaction_id', transactionId)
  if (error) console.error('[freepay-webhook] db err:', error)

  if (mapped === 'paid' && !wasAlreadyPaid) {
    const amount = pickAmount(body)
    const name = pickName(body) || existing?.customer_name || 'Cliente'
    const amountCents = Number(existing?.amount) || (amount >= 1000 ? amount : amount * 100)

    // Notifica Utmify - pedido pago
    try {
      const { sendUtmifyOrder } = await import('@/lib/utmify.server')
      const item = Array.isArray(existing?.items_json) ? (existing?.items_json as any[])[0] : null
      const { resolveGateway } = await import('@/lib/legacy-gateway.server')
      const gateway = await resolveGateway()
      await sendUtmifyOrder({
        orderId: String(transactionId),
        status: 'paid',
        amountCents,
        platform: gateway === 'legacy' ? 'Legacy' : 'FreePay',
        customer: {
          name,
          email: existing?.customer_email || 'cliente@gmail.com',
          document: existing?.customer_cpf || undefined,
          phone: existing?.customer_phone || undefined,
          ip: existing?.customer_ip || undefined,
        },
        product: {
          id: item?.name || 'produto',
          name: item?.name || 'Produto',
          quantity: item?.quantity || 1,
          priceCents: amountCents,
        },
        trackingParameters: existing?.tracking_json ? (existing.tracking_json as any) : undefined
      })
    } catch (e) { console.error('[utmify] webhook notify failed', e) }

    // Facebook Conversions API - Purchase (somente pedidos pagos)
    try {
      const tracking: any = (existing?.tracking_json as any) || {}
      const { sendFbPurchase } = await import('@/lib/fb-capi.server')
      await sendFbPurchase({
        eventId: String(transactionId),
        value: amountCents / 100,
        currency: 'BRL',
        eventSourceUrl: tracking.event_source_url || undefined,
        customer: {
          name,
          email: existing?.customer_email || undefined,
          phone: existing?.customer_phone || undefined,
          cpf: existing?.customer_cpf || undefined,
          ip: existing?.customer_ip || undefined,
          userAgent: tracking.user_agent || undefined,
        },
        fbp: tracking.fbp || undefined,
        fbc: tracking.fbc || undefined,
        externalId: existing?.customer_cpf || undefined,
      })
    } catch (e) { console.error('[fb-capi] webhook notify failed', e) }


    if (process.env.PUSHCUT_WEBHOOK_URL) {
      fetch(process.env.PUSHCUT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Pagamento Aprovado',
          text: `Valor: R$ ${formatAmountBRL(amount, existing?.amount)}`,
          sound: 'cash_register',
        }),
      }).catch(() => {})
    }
  }

  return { code: 200, msg: 'ok' }
}

export const Route = createFileRoute('/api/public/freepay-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text()
          const r = await processWebhook(raw)
          return new Response(r.msg, { status: r.code })
        } catch (err) {
          console.error('[freepay-webhook] error:', err)
          return new Response('error', { status: 200 }) // 200 to avoid retries loop
        }
      },
      GET: async () => new Response('freepay-webhook ok', { status: 200 }),
    }
  }
})
