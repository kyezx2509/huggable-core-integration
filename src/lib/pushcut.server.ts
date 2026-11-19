// Notificacoes Pushcut.
// PUSHCUT_WEBHOOK_URL = URL completa da notificacao de VENDA GERADA
//   ex: https://api.pushcut.io/<token>/notifications/VegaCheckoutPV2
// A notificacao de VENDA PAGA usa PUSHCUT_PAID_WEBHOOK_URL se existir;
// caso contrario deriva da principal trocando "VegaCheckoutPV2" por "VegaCheckoutPV".

const DEFAULT_NOTIFICATION = 'VegaCheckoutPV2'
const PAID_NOTIFICATION = 'VegaCheckoutPV'

function normalize(raw: string): string | null {
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

function resolveUrl(): string | null {
  const raw = (process.env['PUSHCUT_WEBHOOK_URL'] || '').trim()
  return raw ? normalize(raw) : null
}

function resolvePaidUrl(): string | null {
  const paidRaw = (process.env['PUSHCUT_PAID_WEBHOOK_URL'] || '').trim()
  if (paidRaw) return normalize(paidRaw)
  const base = resolveUrl()
  if (!base) return null
  // Deriva a notificacao de pago a partir da de gerado (VegaCheckoutPV2 -> VegaCheckoutPV)
  if (base.includes(DEFAULT_NOTIFICATION)) return base.replace(DEFAULT_NOTIFICATION, PAID_NOTIFICATION)
  return base
}

async function post(url: string, title: string, text: string): Promise<void> {
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

/** title = linha de cima (ex: "OFERTA ML"), text = linha de baixo. Usa a URL de venda gerada. */
export async function sendPushcut(title: string, text: string): Promise<void> {
  const url = resolveUrl()
  if (!url) {
    console.warn('[pushcut] PUSHCUT_WEBHOOK_URL nao configurada')
    return
  }
  await post(url, title, text)
}

export function brl(cents: number): string {
  return `$${(Number(cents || 0) / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN`
}

/** Venda gerada: "VENDA GERADA R$ 19,90" na notificacao VegaCheckoutPV2 */
export async function notifyVendaGerada(amountCents: number): Promise<void> {
  await sendPushcut('OFERTA ML', `VENDA GERADA ${brl(amountCents)}`)
}

/** Venda paga: "VENDA PAGA R$ 19,90 🔥" na notificacao VegaCheckoutPV */
export async function notifyVendaPaga(amountCents: number): Promise<void> {
  const url = resolvePaidUrl()
  if (!url) {
    console.warn('[pushcut] URL de venda paga nao configurada')
    return
  }
  await post(url, 'OFERTA ML', `VENDA PAGA ${brl(amountCents)} 🔥`)
}
