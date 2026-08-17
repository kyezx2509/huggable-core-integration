import { createFileRoute } from '@tanstack/react-router'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
}

function getIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  )
}

export const Route = createFileRoute('/api/public/log-login-attempt')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}))
          const email = String(body.email || '').slice(0, 320)
          const attempted_password = body.password ? String(body.password).slice(0, 200) : null
          const success = !!body.success
          const error_message = body.error_message ? String(body.error_message).slice(0, 500) : null

          const ip = getIp(request)
          const user_agent = request.headers.get('user-agent') || null

          let country: string | null = null
          let region: string | null = null
          let city: string | null = null
          if (ip) {
            try {
              const geo: any = await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json())
              country = geo?.country_name || null
              region = geo?.region || null
              city = geo?.city || null
            } catch {}
          }

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          await supabaseAdmin.from('login_attempts').insert({
            email, attempted_password, success, ip, user_agent, country, region, city, error_message,
          } as any)

          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        } catch (err: any) {
          console.error('log-login-attempt error:', err)
          return new Response(JSON.stringify({ ok: false }), {
            status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
