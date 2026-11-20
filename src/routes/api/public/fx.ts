import { createFileRoute } from '@tanstack/react-router'

// Cotacao publica MXN -> BRL, usada pelo pixel do browser para disparar o
// Purchase em reais (mesmo criterio do servidor).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

export const Route = createFileRoute('/api/public/fx')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        try {
          const { mxnToBrlRate } = await import('@/lib/fx.server')
          const rate = await mxnToBrlRate()
          return new Response(JSON.stringify({ mxnBrl: rate }), { status: 200, headers: cors })
        } catch {
          return new Response(JSON.stringify({ mxnBrl: 0.29 }), { status: 200, headers: cors })
        }
      },
    },
  },
})
