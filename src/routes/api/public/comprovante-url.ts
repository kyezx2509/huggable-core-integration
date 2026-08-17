import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

// Retorna URL assinada para visualizar comprovante. Requer usuário autenticado como admin.
export const Route = createFileRoute('/api/public/comprovante-url')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const path = url.searchParams.get('path') || ''
          const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
          if (!path || !token) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })
          }
          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
          const { data: userData } = await sb.auth.getUser(token)
          if (!userData?.user) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })
          }
          const { data: admin } = await sb.from('admin_users').select('id').eq('id', userData.user.id).maybeSingle()
          if (!admin) {
            return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors })
          }
          const { data: signed, error } = await sb.storage.from('comprovantes').createSignedUrl(path, 60 * 10)
          if (error || !signed) {
            return new Response(JSON.stringify({ error: 'sign_failed', details: error?.message }), { status: 500, headers: cors })
          }
          return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200, headers: cors })
        } catch (err: any) {
          return new Response(JSON.stringify({ error: 'internal', message: err?.message }), { status: 500, headers: cors })
        }
      },
    },
  },
})
