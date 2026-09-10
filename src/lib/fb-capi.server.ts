// Facebook Conversions API (server-side)
// Suporta MULTIPLOS pixels: cada par (FB_PIXEL_ID_n + FB_CAPI_TOKEN_n) recebe o evento.
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

/** Pares pixel/token configurados (FB_PIXEL_ID_1/2/3 com fallback para FB_PIXEL_ID). */
function pixelPairs(): Array<{ pixelId: string; token: string }> {
  const pairs: Array<{ pixelId: string; token: string }> = []
  const push = (pixelId?: string, token?: string) => {
    if (pixelId && token && !pairs.some((p) => p.pixelId === pixelId)) pairs.push({ pixelId, token })
  }
  push(process.env['FB_PIXEL_ID_1'] || process.env['FB_PIXEL_ID'], process.env['FB_CAPI_TOKEN_1'] || process.env['FB_CAPI_TOKEN'])
  push(process.env['FB_PIXEL_ID_2'], process.env['FB_CAPI_TOKEN_2'])
  push(process.env['FB_PIXEL_ID_3'], process.env['FB_CAPI_TOKEN_3'])
  return pairs
}

export interface FbCustomer {
  name?: string
  email?: string
  phone?: string
  cpf?: string
  ip?: string
  userAgent?: string
}

export interface FbEventInput {
  eventName: 'Purchase' | 'InitiateCheckout' | 'AddToCart' | 'ViewContent'
  eventId: string // dedup com o pixel do browser
  value: number // BRL
  currency?: string
  eventSourceUrl?: string
  customer: FbCustomer
  fbp?: string
  fbc?: string
  externalId?: string
  contentName?: string
  contentId?: string
  quantity?: number
}

function buildUserData(input: FbEventInput) {
  const [firstName, ...rest] = (input.customer.name || '').trim().split(/\s+/)
  const lastName = rest.join(' ')
  const phoneDigits = onlyDigits(input.customer.phone)
  const cpfDigits = onlyDigits(input.customer.cpf)
  const external = input.externalId || cpfDigits

  const userData: Record<string, any> = {
    em: input.customer.email ? [sha256(input.customer.email)] : undefined,
    ph: phoneDigits ? [sha256(phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`)] : undefined,
    fn: firstName ? [sha256(firstName)] : undefined,
    ln: lastName ? [sha256(lastName)] : undefined,
    external_id: external ? [sha256(external)] : undefined,
    country: [sha256('br')],
    client_ip_address: input.customer.ip || undefined,
    client_user_agent: input.customer.userAgent || undefined,
    fbp: input.fbp || undefined,
    fbc: input.fbc || undefined,
  }
  Object.keys(userData).forEach((k) => userData[k] === undefined && delete userData[k])
  return userData
}

export async function sendFbEvent(input: FbEventInput): Promise<{ ok: boolean; sent: number }> {
  const pairs = pixelPairs()
  if (!pairs.length) {
    console.warn('[fb-capi] nenhum pixel/token configurado')
    return { ok: false, sent: 0 }
  }

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: 'website',
        event_source_url:
          input.eventSourceUrl ||
          'https://project--62d68104-f46e-40dc-8e09-526c2401da3a.lovable.app/checkout',
        user_data: buildUserData(input),
        custom_data: {
          currency: input.currency || 'BRL',
          value: Number(Number(input.value || 0).toFixed(2)),
          content_type: 'product',
          content_name: input.contentName || 'KIT CELIMAX',
          content_ids: [input.contentId || 'kit-celimax'],
          contents: [{ id: input.contentId || 'kit-celimax', quantity: input.quantity || 1 }],
          num_items: input.quantity || 1,
        },
      },
    ],
  }

  let sent = 0
  await Promise.all(
    pairs.map(async ({ pixelId, token }) => {
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const text = await res.text()
        if (!res.ok) console.error('[fb-capi]', pixelId, input.eventName, 'error', res.status, text.slice(0, 300))
        else {
          sent++
          console.log('[fb-capi]', pixelId, input.eventName, 'ok', input.eventId, text.slice(0, 160))
        }
      } catch (err) {
        console.error('[fb-capi] fetch failed', pixelId, err)
      }
    })
  )

  return { ok: sent > 0, sent }
}

export interface FbPurchaseInput {
  eventId: string
  value: number
  currency?: string
  eventSourceUrl?: string
  customer: FbCustomer
  fbp?: string
  fbc?: string
  externalId?: string
}

export async function sendFbPurchase(input: FbPurchaseInput) {
  return sendFbEvent({ ...input, eventName: 'Purchase' })
}
