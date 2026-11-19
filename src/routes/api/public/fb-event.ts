import { createFileRoute } from '@tanstack/react-router'

// Relay server-side (Conversions API) de eventos do navegador.
// Usado para InitiateCheckout com o mesmo event_id do pixel (dedup automatico).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const ALLOWED = new Set(['InitiateCheckout', 'ViewContent', 'AddToCart'])

export const Route = createFileRoute('/api/public/fb-event')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}))
          const eventName = String(body?.event_name || '')
          if (!ALLOWED.has(eventName)) {
            return new Response(JSON.stringify({ error: 'event not allowed' }), { status: 400, headers: cors })
          }
          const eventId = String(body?.event_id || '')
          if (!eventId) {
            return new Response(JSON.stringify({ error: 'event_id required' }), { status: 400, headers: cors })
          }

          const ip =
            request.headers.get('cf-connecting-ip') ||
            (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
            undefined

          const { sendFbEvent } = await import('@/lib/fb-capi.server')
          const r = await sendFbEvent({
            eventName: eventName as any,
            eventId,
            value: Number(body?.value) || 0,
            currency: 'MXN',
            eventSourceUrl: body?.event_source_url || undefined,
            customer: {
              name: body?.name || undefined,
              email: body?.email || undefined,
              phone: body?.phone || undefined,
              cpf: body?.cpf || undefined,
              ip,
              userAgent: request.headers.get('user-agent') || undefined,
            },
            fbp: body?.fbp || undefined,
            fbc: body?.fbc || undefined,
            contentName: body?.content_name || undefined,
            contentId: body?.content_id || undefined,
            quantity: Number(body?.quantity) || 1,
          })

          return new Response(JSON.stringify({ ok: r.ok, sent: r.sent }), { status: 200, headers: cors })
        } catch (e) {
          console.error('[fb-event] error', e)
          return new Response(JSON.stringify({ error: 'internal' }), { status: 200, headers: cors })
        }
      },
    },
  },
})
