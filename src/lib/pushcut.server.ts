// Notificacoes Pushcut (mesma conta/token do projeto LOJA CAMISETAS)
// Aceita tanto a URL base (https://api.pushcut.io/<token>) quanto uma URL completa
// com /notifications/<nome> — sempre normaliza para o formato correto.

function baseUrl(): string | null {
  const raw = (process.env['PUSHCUT_WEBHOOK_URL'] || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    const token = u.pathname.split('/').filter(Boolean)[0]
    if (!token) return null
    return `${u.origin}/${token}`
  } catch {
    return null
  }
}

export async function sendPushcut(notification: string, text: string): Promise<void> {
  const base = baseUrl()
  if (!base) {
    console.warn('[pushcut] PUSHCUT_WEBHOOK_URL nao configurada')
    return
  }
  const url = `${base}/notifications/${encodeURIComponent(notification)}?text=${encodeURIComponent(text)}&cb=${Date.now()}`
  try {
    const r = await fetch(url)
    console.log('[pushcut]', notification, r.status)
  } catch (e) {
    console.error('[pushcut] error', e)
  }
}
