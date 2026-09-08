// Notificacoes Pushcut.
// O segredo PUSHCUT_WEBHOOK_URL normalmente ja vem no formato completo:
// https://api.pushcut.io/<token>/notifications/<NomeDaNotificacao>
// Nesse caso usamos a URL exatamente como esta (o nome da notificacao precisa
// existir na conta Pushcut, senao a API responde 404).
// Se vier apenas a base (https://api.pushcut.io/<token>), montamos com um nome padrao.

const DEFAULT_NOTIFICATION = 'VegaCheckoutPV2'

function resolveUrl(): string | null {
  const raw = (process.env['PUSHCUT_WEBHOOK_URL'] || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw.split('?')[0] as string)
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.includes('notifications')) {
      return `${u.origin}/${parts.join('/')}`
    }
    const token = parts[0]
    if (!token) return null
    return `${u.origin}/${token}/notifications/${encodeURIComponent(DEFAULT_NOTIFICATION)}`
  } catch {
    return null
  }
}

/** title = linha de cima (ex: "OFERTA ML"), text = linha de baixo (ex: "VENDA GERADA R$ 19,90") */
export async function sendPushcut(title: string, text: string): Promise<void> {
  const url = resolveUrl()
  if (!url) {
    console.warn('[pushcut] PUSHCUT_WEBHOOK_URL nao configurada')
    return
  }
  try {
    const r = await fetch(`${url}?cb=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text }),
    })
    console.log('[pushcut]', title, text, r.status)
    if (!r.ok) {
      console.warn('[pushcut] body', (await r.text()).slice(0, 200))
      // fallback GET (alguns webhooks so aceitam GET)
      const g = await fetch(`${url}?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&cb=${Date.now()}`)
      console.log('[pushcut] fallback GET', g.status)
    }
  } catch (e) {
    console.error('[pushcut] error', e)
  }
}

export function brl(cents: number): string {
  return `R$ ${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')}`
}
