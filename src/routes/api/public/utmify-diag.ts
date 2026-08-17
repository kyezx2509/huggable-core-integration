import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// Diagnostico da integracao Utmify.
// GET /api/public/utmify-diag?transaction_id=xxx&status=waiting_payment|paid
// Reenvia o pedido para a Utmify usando os mesmos dados do banco e devolve
// a resposta crua da Utmify (util para validar credencial e atribuicao).
export const Route = createFileRoute('/api/public/utmify-diag')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        const url = new URL(request.url)
        const transactionId = url.searchParams.get('transaction_id')
        const status = (url.searchParams.get('status') || 'waiting_payment') as 'waiting_payment' | 'paid'

        const configured = Boolean((process.env['UTMIFY_API_TOKEN'] || '').trim())
        if (!transactionId) {
          return new Response(JSON.stringify({ token_configured: configured }), { status: 200, headers })
        }

        const supabase = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
        const { data } = await supabase
          .from('payment_transactions')
          .select('amount, customer_name, customer_email, customer_cpf, customer_phone, customer_ip, items_json, tracking_json, status')
          .eq('transaction_id', transactionId)
          .maybeSingle()

        if (!data) {
          return new Response(JSON.stringify({ token_configured: configured, error: 'transaction not found' }), { status: 404, headers })
        }

        const item = Array.isArray(data.items_json) ? (data.items_json as any[])[0] : null
        const amountCents = Number(data.amount) || 0
        const { sendUtmifyOrder } = await import('@/lib/utmify.server')
        const res = await sendUtmifyOrder({
          orderId: String(transactionId),
          status,
          amountCents,
          customer: {
            name: data.customer_name || 'Cliente',
            email: data.customer_email || 'cliente@gmail.com',
            document: data.customer_cpf || undefined,
            phone: data.customer_phone || undefined,
            ip: data.customer_ip || undefined,
          },
          product: {
            id: item?.name || 'produto',
            name: item?.name || 'Produto',
            quantity: item?.quantity || 1,
            priceCents: amountCents,
          },
          trackingParameters: (data.tracking_json as any) || undefined,
        })

        return new Response(JSON.stringify({ token_configured: configured, db_status: data.status, utmify: res }), { status: 200, headers })
      },
    },
  },
})
