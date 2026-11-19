import { createClient } from '@supabase/supabase-js'
import { createXpagCharge, type XpagMethod } from '@/lib/xpag.server'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400' } })
}

// O gateway NUNCA recebe nome da loja/produto real nem URL do checkout.
const GATEWAY_PRODUCT = 'KIT CELIMAX'

export async function handleXpagCheckout(request: Request): Promise<Response> {
  const sb = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const logErr = async (stage: string, message: string, extra: any = {}) => {
    try {
      await sb.from('checkout_errors' as any).insert({
        customer_name: extra.name || null, customer_email: extra.email || null, customer_phone: extra.phone || null,
        amount: extra.amount ?? null, gateway: 'xpag', stage, error_message: message,
        error_details: extra.details ? JSON.parse(JSON.stringify(extra.details)) : null,
        is_upsell: !!extra.isUpsell, customer_ip: ip, user_agent: request.headers.get('user-agent') || null,
      })
    } catch (e) { console.error('[checkout_errors]', e) }
  }

  try {
    const body: any = await request.json()
    const { amount, items, tracking, isUpsell } = body
    const address = body.address || body.shipping || null
    const method: XpagMethod = String(body.method || '').toLowerCase() === 'oxxo' ? 'oxxo' : 'spei'
    const c = body.customer || {}
    const name = String(c.name || '').trim()
    const phone = String(c.phone || '').replace(/\D/g, '')
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'cliente'
    const email = String(c.email || '').trim() || `${slug}@gmail.com`
    const amountCents = Math.round(Number(amount) || 0)

    if (!amountCents || !name) {
      await logErr('validacion', 'Faltan campos (monto o nombre)', { name, email, phone, amount: amountCents, isUpsell })
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios' }), { status: 400, headers: cors })
    }
    if (method === 'oxxo' && (amountCents < 1000 || amountCents > 1000000)) {
      await logErr('validacion', 'Monto fuera del rango OXXO ($10 a $10,000)', { name, email, phone, amount: amountCents, isUpsell })
      return new Response(JSON.stringify({ error: 'OXXO acepta pagos de $10 a $10,000 MXN. Elige SPEI.' }), { status: 400, headers: cors })
    }

    const externalId = `MX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const webhookUrl = `${new URL(request.url).origin}/api/public/xpag-webhook`
    const charge = await createXpagCharge({ method, amountCents, externalId, webhookUrl, name, email, description: GATEWAY_PRODUCT })

    if (!charge.ok || !charge.id) {
      await logErr('gateway', charge.message || 'Error XPag', { name, email, phone, amount: amountCents, details: charge.raw, isUpsell })
      return new Response(JSON.stringify({ error: 'No pudimos generar tu pago. Intenta de nuevo o elige otro método.', details: charge.message }), { status: charge.status || 502, headers: cors })
    }

    await sb.from('payment_transactions').insert({
      transaction_id: charge.id,
      status: 'pending',
      amount: amountCents,
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      customer_cpf: null,
      customer_address: address,
      items_json: items || null,
      payment_method: method,
      gateway: 'xpag',
      customer_ip: ip,
      tracking_json: { ...(tracking || {}), external_id: externalId, user_agent: request.headers.get('user-agent') || null },
    })

    try {
      const { sendUtmifyOrder } = await import('@/lib/utmify.server')
      await sendUtmifyOrder({
        orderId: charge.id, status: 'waiting_payment', amountCents, platform: 'XPag',
        customer: { name, email, phone, ip: ip || undefined } as any,
        product: { id: GATEWAY_PRODUCT, name: GATEWAY_PRODUCT, quantity: items?.[0]?.quantity || 1, priceCents: amountCents },
        trackingParameters: tracking || {},
      })
    } catch (e) { console.error('[utmify]', e) }
    try {
      const { notifyVendaGerada } = await import('@/lib/pushcut.server')
      await notifyVendaGerada(amountCents)
    } catch (e) { console.error('[pushcut]', e) }

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: charge.id, method, amount: amountCents / 100, currency: 'MXN',
        clabe: charge.clabe || null, reference: charge.reference || null,
        bank_name: charge.bankName || null, beneficiary: charge.beneficiary || null,
        barcode_url: charge.barcodeUrl || null, expires_at: charge.expiresAt || null,
      },
    }), { status: 200, headers: cors })
  } catch (err: any) {
    console.error('[xpag-checkout]', err)
    await logErr('servidor', err?.message || 'Error interno')
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: cors })
  }
}
