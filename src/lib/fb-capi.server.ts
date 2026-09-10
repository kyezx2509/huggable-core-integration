// Facebook Conversions API (server-side) - Purchase event
import { createHash } from 'crypto'

function sha256(v?: string | null) {
  if (!v) return undefined
  const s = String(v).trim().toLowerCase()
  if (!s) return undefined
  return createHash('sha256').update(s).digest('hex')
}

function onlyDigits(v?: string | null) {
  return v ? String(v).replace(/\D/g, '') : undefined
}

export interface FbPurchaseInput {
  eventId: string // dedup com o pixel do browser; usar transaction_id
  value: number // BRL
  currency?: string
  eventSourceUrl?: string
  customer: { name?: string; email?: string; phone?: string; cpf?: string; ip?: string; userAgent?: string }
  fbp?: string
  fbc?: string
  externalId?: string
}

export async function sendFbPurchase(input: FbPurchaseInput): Promise<{ ok: boolean; status?: number; body?: string }> {
  const pixelId = process.env['FB_PIXEL_ID']
  const token = process.env['FB_CAPI_TOKEN']
  if (!pixelId || !token) {
    console.warn('[fb-capi] FB_PIXEL_ID / FB_CAPI_TOKEN not configured')
    return { ok: false }
  }

  const [firstName, ...rest] = (input.customer.name || '').trim().split(/\s+/)
  const lastName = rest.join(' ')
  const phoneDigits = onlyDigits(input.customer.phone)
  const cpfDigits = onlyDigits(input.customer.cpf)

  const userData: Record<string, any> = {
    em: input.customer.email ? [sha256(input.customer.email)] : undefined,
    ph: phoneDigits ? [sha256(phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`)] : undefined,
    fn: firstName ? [sha256(firstName)] : undefined,
    ln: lastName ? [sha256(lastName)] : undefined,
    external_id: input.externalId || cpfDigits ? [sha256(input.externalId || cpfDigits)] : undefined,
    country: [sha256('br')],
    client_ip_address: input.customer.ip || undefined,
    client_user_agent: input.customer.userAgent || undefined,
    fbp: input.fbp || undefined,
    fbc: input.fbc || undefined,
  }
  Object.keys(userData).forEach((k) => userData[k] === undefined && delete userData[k])

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: 'website',
        event_source_url:
          input.eventSourceUrl ||
          'https://project--62d68104-f46e-40dc-8e09-526c2401da3a.lovable.app/checkout',
        user_data: userData,
        custom_data: {
          currency: input.currency || 'BRL',
          value: Number(input.value.toFixed(2)),
        },
      },
    ],
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    if (!res.ok) console.error('[fb-capi] error', res.status, text)
    else console.log('[fb-capi] Purchase ok', input.eventId, text.slice(0, 200))
    return { ok: res.ok, status: res.status, body: text }
  } catch (err) {
    console.error('[fb-capi] fetch failed', err)
    return { ok: false }
  }
}
