// Integração com a gateway Legacy (legacyecombrasil)
// Docs: https://developers.legacyecombrasil.com/docs/inicio-rapido

const LEGACY_BASE = 'https://api.legacyecombrasil.com'

export function activeGateway(): 'legacy' | 'freepay' {
  const g = String(process.env['PIX_GATEWAY'] || '').toLowerCase()
  if (g === 'freepay') return 'freepay'
  if (g === 'legacy') return 'legacy'
  return 'freepay'
}

// Gateway escolhido no painel admin (site_settings.payment_gateway) tem prioridade.
// Fallback: variavel de ambiente PIX_GATEWAY. Padrao: freepay.
export async function resolveGateway(): Promise<'legacy' | 'freepay'> {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_ANON_KEY']
  if (url && key) {
    try {
      const resp = await fetch(
        `${url}/rest/v1/site_settings?key=eq.payment_gateway&select=value`,
        { headers: { apikey: key, Accept: 'application/json' } }
      )
      const rows: any = await resp.json().catch(() => [])
      const v = String(rows?.[0]?.value || '').toLowerCase()
      if (v === 'freepay') return 'freepay'
      if (v === 'legacy') return 'legacy'
    } catch {
      // ignora e cai no fallback
    }
  }
  return activeGateway()
}

export function legacyAuthHeader() {
  const pub = process.env['LEGACY_PUBLIC_KEY']
  const sec = process.env['LEGACY_SECRET_KEY']
  if (!pub || !sec) throw new Error('Chaves da Legacy não configuradas')
  return 'Basic ' + Buffer.from(`${pub}:${sec}`).toString('base64')
}

// A Legacy exige uma URL publica valida; em dev (localhost) usamos a URL estavel do projeto.
const FALLBACK_BASE = 'https://project--9e11aaa5-ceeb-442b-aa6d-add0bb7d233d.lovable.app'
export function safeWebhookUrl(url: string) {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:' && !u.hostname.includes('localhost') && !u.hostname.startsWith('127.')) return url
    return `${FALLBACK_BASE}${u.pathname}`
  } catch {
    return `${FALLBACK_BASE}/api/public/freepay-webhook`
  }
}

export type LegacyPixInput = {
  amountCents: number
  referenceId?: string
  webhookUrl: string
  payerIp?: string
  isPhysicalProduct?: boolean
  customer: {
    name: string
    document: string
    email: string
    phone?: string
    address?: {
      street?: string
      number?: string
      zipCode?: string
      city?: string
      state?: string
    } | null
  }
  items?: Array<{ title: string; quantity: number; unitPriceCents: number }>
}

export type LegacyPixResult = {
  ok: boolean
  id?: string
  pixCode?: string
  status?: string
  raw: any
}

export async function createLegacyPix(input: LegacyPixInput): Promise<LegacyPixResult> {
  const digits = (input.customer.document || '').replace(/\D/g, '')
  const phone = (input.customer.phone || '').replace(/\D/g, '')
  const payload = {
    paymentMethod: 'PIX',
    amount: Math.round(input.amountCents),
    referenceId: input.referenceId || `pedido-${Date.now()}`,
    webhookUrl: safeWebhookUrl(input.webhookUrl),
    isPhysicalProduct: input.isPhysicalProduct ?? true,
    payerIp: input.payerIp || '127.0.0.1',
    customer: {
      name: input.customer.name,
      document: digits,
      email: input.customer.email,
      phone: phone ? (phone.startsWith('55') ? phone : `55${phone}`) : '5511999999999',
      ...(input.customer.address
        ? {
            address: {
              street: input.customer.address.street || 'Rua Exemplo',
              number: input.customer.address.number || '0',
              zipCode: input.customer.address.zipCode || '01000-000',
              city: input.customer.address.city || 'São Paulo',
              state: input.customer.address.state || 'SP',
            },
          }
        : {}),
    },
    items: (input.items && input.items.length
      ? input.items
      : [{ title: 'Produto', quantity: 1, unitPriceCents: Math.round(input.amountCents) }]
    ).map((it) => ({
      title: it.title,
      quantity: it.quantity || 1,
      unitPrice: Math.round(it.unitPriceCents),
    })),
  }

  const resp = await fetch(`${LEGACY_BASE}/payin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: legacyAuthHeader(),
    },
    body: JSON.stringify(payload),
  })
  const data: any = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    console.error('[legacy] payin error', resp.status, JSON.stringify(data).slice(0, 600))
    return { ok: false, raw: data }
  }
  const tx = data?.data || data
  const pixCode: string =
    tx?.pix?.qrcode || tx?.pix?.qrCode || tx?.pix?.qr_code || tx?.pix?.copyPaste || ''
  const id = String(tx?.id || tx?.externalId || tx?.referenceId || '')
  if (!id || !pixCode) {
    console.error('[legacy] resposta incompleta', JSON.stringify(data).slice(0, 600))
    return { ok: false, raw: data }
  }
  return { ok: true, id, pixCode, status: String(tx?.status || 'PENDING'), raw: data }
}

export async function getLegacyStatus(id: string): Promise<'APPROVED' | 'PENDING' | 'REFUSED'> {
  const resp = await fetch(`${LEGACY_BASE}/payin/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json', Authorization: legacyAuthHeader() },
  })
  const data: any = await resp.json().catch(() => ({}))
  const tx = data?.data || data
  const raw = String(tx?.status || tx?.Status || '').toUpperCase()
  if (['APPROVED', 'PAID', 'COMPLETED'].includes(raw)) return 'APPROVED'
  if (['REFUSED', 'FAILED', 'CANCELED', 'CANCELLED', 'REFUNDED', 'CHARGEDBACK', 'EXPIRED'].includes(raw)) return 'REFUSED'
  return 'PENDING'
}
