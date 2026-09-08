// Notificacoes Pushcut.
// O segredo PUSHCUT_WEBHOOK_URL normalmente ja vem no formato completo:
// https://api.pushcut.io/<token>/notifications/<NomeDaNotificacao>
// Nesse caso usamos a URL exatamente como esta (o nome da notificacao precisa
// existir na conta Pushcut, senao a API responde 404).
// Se vier apenas a base (https://api.pushcut.io/<token>), montamos com o nome recebido.

function resolveUrl(notification: string): string | null {
  const raw = (process.env['PUSHCUT_WEBHOOK_URL'] || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw.split('?')[0])
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.includes('notifications')) {
      // URL completa configurada: mantem o nome da notificacao existente
      return `${u.origin}/${parts.join('/')}`
    }
    const token = parts[0]
    if (!token) return null
    return `${u.origin}/${token}/notifications/${encodeURIComponent(notification)}`
  } catch {
    return null
  }
}

export async function sendPushcut(notification: string, text: string): Promise<void> {
  const url = resolveUrl(notification)
  if (!url) {
    console.warn('[pushcut] PUSHCUT_WEBHOOK_URL nao configurada')
    return
  }
  const full = `${url}?title=${encodeURIComponent(notification)}&text=${encodeURIComponent(text)}&cb=${Date.now()}`
  try {
    const r = await fetch(full)
    console.log('[pushcut]', notification, r.status)
    if (!r.ok) console.warn('[pushcut] body', (await r.text()).slice(0, 200))
  } catch (e) {
    console.error('[pushcut] error', e)
  }
}
