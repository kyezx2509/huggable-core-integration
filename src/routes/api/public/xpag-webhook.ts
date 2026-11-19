import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/xpag-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text()
        const { verifyXpagSignature } = await import('@/lib/xpag.server')
        if (!(await verifyXpagSignature(raw, request.headers.get('x-webhook-signature')))) {
          console.warn('[xpag-webhook] firma invalida')
          return new Response('invalid signature', { status: 401 })
        }
        let b: any = {}
        try { b = JSON.parse(raw) } catch {}
        const status = String(b.status || '').toLowerCase()
        const id = String(b.request_number || b.transaction_id || '')
        console.log('[xpag-webhook]', b.type, status, id, b.external_id)
        if (b.type === 'cashin' && (status === 'confirmed' || status === 'completed') && id) {
          const { markPaid } = await import('@/lib/mark-paid.server')
          let ok = await markPaid(id)
          if (!ok && b.transaction_id && b.transaction_id !== id) ok = await markPaid(String(b.transaction_id))
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      },
    },
  },
})
