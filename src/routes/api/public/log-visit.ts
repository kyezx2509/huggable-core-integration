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

function parseUA(ua: string) {
  const u = ua || ''
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(u)
  const device = isMobile ? (/iPad/i.test(u) ? 'Tablet' : 'Mobile') : 'Desktop'
  let os = 'Desconhecido'
  if (/Windows NT/i.test(u)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(u)) os = 'macOS'
  else if (/Android/i.test(u)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(u)) os = 'iOS'
  else if (/Linux/i.test(u)) os = 'Linux'
  let browser = 'Desconhecido'
  if (/Edg\//i.test(u)) browser = 'Edge'
  else if (/OPR\//i.test(u)) browser = 'Opera'
  else if (/Chrome\//i.test(u)) browser = 'Chrome'
  else if (/Firefox\//i.test(u)) browser = 'Firefox'
  else if (/Safari\//i.test(u)) browser = 'Safari'
  return { isMobile, device, os, browser }
}

export const Route = createFileRoute('/api/public/log-visit')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}))
          const ip = getIp(request)
          const user_agent = request.headers.get('user-agent') || ''
          const { isMobile, device, os, browser } = parseUA(user_agent)

          let geo: any = {}
          if (ip) {
            try {
              geo = await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json())
            } catch {}
          }

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          await supabaseAdmin.from('visitor_logs').insert({
            ip,
            country: geo?.country_name || null,
            region: geo?.region || null,
            city: geo?.city || null,
            postal: geo?.postal || null,
            latitude: geo?.latitude ?? null,
            longitude: geo?.longitude ?? null,
            timezone: geo?.timezone || null,
            isp: geo?.org || null,
            user_agent,
            device, os, browser, is_mobile: isMobile,
            path: String(body.path || '').slice(0, 500) || null,
            referrer: String(body.referrer || '').slice(0, 500) || null,
            utm_source: body.utm_source ? String(body.utm_source).slice(0, 200) : null,
            utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 200) : null,
            utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 200) : null,
            utm_content: body.utm_content ? String(body.utm_content).slice(0, 200) : null,
            utm_term: body.utm_term ? String(body.utm_term).slice(0, 200) : null,
            session_id: body.session_id ? String(body.session_id).slice(0, 100) : null,
          } as any)

          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        } catch (err: any) {
          console.error('log-visit error:', err)
          return new Response(JSON.stringify({ ok: false }), {
            status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
