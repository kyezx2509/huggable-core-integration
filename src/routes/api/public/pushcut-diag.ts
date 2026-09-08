import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/pushcut-diag')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const raw = (process.env['PUSHCUT_WEBHOOK_URL'] || '').trim()
        if (!raw) return Response.json({ configured: false })
        let shape: any = { configured: true }
        try {
          const u = new URL(raw)
          const parts = u.pathname.split('/').filter(Boolean)
          shape = {
            configured: true,
            host: u.host,
            segments: parts.length,
            hasNotifications: parts.includes('notifications'),
            notificationName: parts.includes('notifications')
              ? parts[parts.indexOf('notifications') + 1] || null
              : null,
          }
        } catch {
          shape.parseError = true
        }
        if (url.searchParams.get('send') === '1') {
          const { sendPushcut } = await import('@/lib/pushcut.server')
          await sendPushcut('Pedido', 'Teste de notificacao')
          const r = await fetch(raw.split('?')[0] + '?text=' + encodeURIComponent('Teste raw'))
          shape.rawStatus = r.status
          shape.rawBody = (await r.text()).slice(0, 200)
        }
        return Response.json(shape)
      },
    },
  },
})
