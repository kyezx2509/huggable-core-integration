// Server-side Utmify order notification
// Docs: POST https://api.utmify.com.br/api-credentials/orders  header: x-api-token

type UtmifyStatus = 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback'

export interface UtmifyOrderInput {
  orderId: string
  status: UtmifyStatus
  amountCents: number
  customer: { name: string; email: string; document?: string; phone?: string; ip?: string }
  product: { id?: string; name: string; quantity?: number; priceCents?: number }
  trackingParameters?: Record<string, string | null>
  createdAt?: string // ISO
  approvedAt?: string | null
  refundedAt?: string | null
  platform?: string
}

function nowUtcSql(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
}

export async function sendUtmifyOrder(input: UtmifyOrderInput): Promise<{ ok: boolean; status?: number; body?: string }> {
  const tokens = [process.env['UTMIFY_API_TOKEN'], process.env['UTMIFY_API_TOKEN_2']]
    .map((t) => (t || '').trim())
    .filter(Boolean) as string[]
  if (tokens.length === 0) {
    console.warn('[utmify] UTMIFY_API_TOKEN not configured')
    return { ok: false }
  }


  const priceCents = input.product.priceCents ?? input.amountCents
  const payload: any = {
    orderId: input.orderId,
    platform: input.platform || 'FreePay',
    paymentMethod: 'pix',
    status: input.status,
    createdAt: input.createdAt || nowUtcSql(),
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone || null,
      document: input.customer.document || null,
      country: 'BR',
      ip: input.customer.ip || '0.0.0.0',
    },
    products: [
      {
        id: input.product.id || 'default',
        name: input.product.name,
        planId: null,
        planName: null,
        quantity: input.product.quantity || 1,
        priceInCents: priceCents,
      },
    ],
    trackingParameters: {
      src: input.trackingParameters?.['src'] || null,
      sck: input.trackingParameters?.['sck'] || null,
      utm_source: input.trackingParameters?.['utm_source'] || null,
      utm_campaign: input.trackingParameters?.['utm_campaign'] || null,
      utm_medium: input.trackingParameters?.['utm_medium'] || null,
      utm_content: input.trackingParameters?.['utm_content'] || null,
      utm_term: input.trackingParameters?.['utm_term'] || null,
    },
    commission: {
      totalPriceInCents: input.amountCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: input.amountCents,
    },
    isTest: false,
  }

  payload.approvedDate = input.status === 'paid' ? (input.approvedAt || nowUtcSql()) : null
  payload.refundedAt = input.status === 'refunded' ? (input.refundedAt || nowUtcSql()) : null


  try {
    const results = await Promise.all(
      tokens.map(async (token, i) => {
        const res = await fetch('https://api.utmify.com.br/api-credentials/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': token,
          },
          body: JSON.stringify(payload),
        })
        const text = await res.text()
        if (!res.ok) console.error(`[utmify#${i + 1}] error`, res.status, text)
        else console.log(`[utmify#${i + 1}] ok`, input.status, input.orderId)
        return { ok: res.ok, status: res.status, body: text }
      })
    )
    return results[0]!
  } catch (err) {
    console.error('[utmify] fetch failed', err)
    return { ok: false }
  }

}
