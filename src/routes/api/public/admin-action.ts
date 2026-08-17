import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

export const Route = createFileRoute('/api/public/admin-action')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get('authorization') || ''
          const token = auth.replace(/^Bearer\s+/i, '').trim()
          if (!token) return bad('Unauthorized', 401)

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
          if (uErr || !userData.user) return bad('Unauthorized', 401)

          const { data: roleRow } = await supabaseAdmin
            .from('user_roles' as any).select('role')
            .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
          // Fallback: also check admin_users
          let isAdmin = !!roleRow
          if (!isAdmin) {
            const { data: au } = await supabaseAdmin
              .from('admin_users').select('id').eq('id', userData.user.id).maybeSingle()
            isAdmin = !!au
          }
          if (!isAdmin) return bad('Forbidden', 403)

          const body = await request.json()
          const action = body.action as string

          if (action === 'sign_receipt') {
            const path = String(body.path || '')
            if (!path) return bad('path required')
            const { data, error } = await supabaseAdmin.storage.from('comprovantes').createSignedUrl(path, 60 * 60)
            if (error) return bad(error.message)
            return ok({ url: data.signedUrl })
          }
          if (action === 'mark_paid') {
            const id = String(body.id || '')
            if (!id) return bad('id required')
            await supabaseAdmin.from('payment_transactions')
              .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
              .eq('id', id)
            return ok({ id })
          }
          if (action === 'delete_tx') {
            const id = String(body.id || '')
            if (!id) return bad('id required')
            await supabaseAdmin.from('payment_transactions').delete().eq('id', id)
            return ok({ id })
          }
          if (action === 'set_setting') {
            const key = String(body.key || '')
            const value = String(body.value || '')
            if (!key) return bad('key required')
            await supabaseAdmin.from('site_settings' as any).upsert(
              { key, value, updated_at: new Date().toISOString() },
              { onConflict: 'key' }
            )
            return ok({ key, value })
          }

          return bad('unknown action')
        } catch (err: any) {
          console.error('admin-action error:', err)
          return bad(err?.message || 'Erro', 500)
        }
      },
    },
  },
})

function ok(data: any) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
