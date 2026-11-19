import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

export const Route = createFileRoute('/api/public/payment-status')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } }),
      GET: async ({ request }) => {
        try {
          const id = new URL(request.url).searchParams.get('transaction_id')
          if (!id) return new Response(JSON.stringify({ error: 'transaction_id required' }), { status: 400, headers: cors })
          const sb = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
          const { data } = await sb.from('payment_transactions').select('status').eq('transaction_id', id).maybeSingle()
          if (!data) return new Response(JSON.stringify({ status: 'not_found' }), { status: 200, headers: cors })
          if (data.status === 'paid') return new Response(JSON.stringify({ status: 'paid' }), { status: 200, headers: cors })
          const { getXpagStatus } = await import('@/lib/xpag.server')
          const st = await getXpagStatus(id).catch(() => '')
          if (st === 'confirmed' || st === 'completed' || st === 'paid') {
            const { markPaid } = await import('@/lib/mark-paid.server')
            await markPaid(id)
            return new Response(JSON.stringify({ status: 'paid' }), { status: 200, headers: cors })
          }
          return new Response(JSON.stringify({ status: st === 'expired' ? 'expired' : 'pending' }), { status: 200, headers: cors })
        } catch {
          return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: cors })
        }
      },
    },
  },
})
