// Integracao XPag (Mexico: OXXO e SPEI). Docs: https://xpag.global/docs
const BASE = 'https://api.xpag.global'

function headers() {
  const id = process.env['XPAG_CLIENT_ID']
  const secret = process.env['XPAG_CLIENT_SECRET']
  if (!id || !secret) throw new Error('XPAG_CLIENT_ID / XPAG_CLIENT_SECRET no configurados')
  return { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Client-Id': id, 'X-Client-Secret': secret }
}

export type XpagMethod = 'oxxo' | 'spei'

export type XpagCharge = {
  ok: boolean
  id?: string
  method: XpagMethod
  // SPEI
  clabe?: string | undefined
  reference?: string | undefined
  bankName?: string | undefined
  beneficiary?: string | undefined
  // OXXO
  barcodeUrl?: string | undefined
  expiresAt?: string
  message?: string
  raw?: any
  status?: number
}

export async function createXpagCharge(input: {
  method: XpagMethod
  amountCents: number
  externalId: string
  webhookUrl: string
  name: string
  email: string
  description: string
}): Promise<XpagCharge> {
  const amount = Math.round(input.amountCents) / 100
  const body: any = {
    currency: 'MXN',
    amount,
    external_id: input.externalId,
    webhook_url: input.webhookUrl,
    description: input.description,
  }
  if (input.method === 'oxxo') {
    body.method = 'OXXO'
    body.generateCheckout = false
    body.payerData = { name: input.name, email: input.email }
  } else {
    body.name = input.name
  }
  const r = await fetch(`${BASE}/cashin`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
  const d: any = await r.json().catch(() => ({}))
  if (!r.ok || d?.ok === false) {
    return { ok: false, method: input.method, message: d?.message || d?.error || d?.error_code || `XPag HTTP ${r.status}`, raw: d, status: r.status || 502 }
  }
  const id = String(d.request_number || d.transaction_id || '')
  if (input.method === 'oxxo') {
    const pd = d.payee_data || {}
    const reference = pd.reference || d.reference
    if (!id || !reference) return { ok: false, method: 'oxxo', message: 'XPag no devolvió referencia OXXO', raw: d, status: 502 }
    const exp = new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString()
    return { ok: true, id, method: 'oxxo', reference: String(reference), barcodeUrl: pd.barcode || d.barcode, expiresAt: exp, raw: d }
  }
  if (!id || !d.clabe) return { ok: false, method: 'spei', message: 'XPag no devolvió CLABE', raw: d, status: 502 }
  return {
    ok: true, id, method: 'spei', clabe: String(d.clabe), reference: d.reference ? String(d.reference) : undefined,
    bankName: d.bank_name, beneficiary: d.beneficiary,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), raw: d,
  }
}

export async function getXpagStatus(id: string): Promise<string> {
  const key = id.startsWith('oxxo_') || id.startsWith('pr_') ? 'request_number' : 'transaction_id'
  const r = await fetch(`${BASE}/consult-transaction?${key}=${encodeURIComponent(id)}`, { headers: headers() })
  const d: any = await r.json().catch(() => ({}))
  return String(d?.status || '').toLowerCase()
}

export async function verifyXpagSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env['XPAG_CLIENT_SECRET']
  if (!secret || !signature) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i)
  return diff === 0
}
