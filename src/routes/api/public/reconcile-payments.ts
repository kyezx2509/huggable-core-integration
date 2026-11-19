import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// Reconciliacion: consulta en XPag los pedidos pendientes recientes y marca los pagados.
// GET /api/public/reconcile-payments?hours=72
export const Route = createFileRoute('/api/public/reconcile-payments')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        const hours = Math.min(Number(new URL(request.url).searchParams.get('hours') || 72) || 72, 720)
        const since = new Date(Date.now() - hours * 3600_000).toISOString()
        const sb = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
        const { data: rows, error } = await sb.from('payment_transactions').select('transaction_id').eq('status', 'pending').eq('gateway', 'xpag').gte('created_at', since).limit(300)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
        const { getXpagStatus } = await import('@/lib/xpag.server')
        const { markPaid } = await import('@/lib/mark-paid.server')
        const paid: string[] = []
        for (const r of rows || []) {
          const st = await getXpagStatus(String(r.transaction_id)).catch(() => '')
          if (st === 'confirmed' || st === 'completed') { if (await markPaid(String(r.transaction_id))) paid.push(String(r.transaction_id)) }
        }
        return new Response(JSON.stringify({ checked: rows?.length || 0, paid }), { status: 200, headers })
      },
    },
  },
})
