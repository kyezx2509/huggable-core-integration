import { createClient } from '@supabase/supabase-js'

// Marca o pedido como pago (idempotente) e dispara Facebook CAPI, Utmify e Pushcut uma unica vez.
export async function markPaid(transactionId: string): Promise<boolean> {
  const sb = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
  const { data: updated } = await sb
    .from('payment_transactions')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('transaction_id', transactionId)
    .neq('status', 'paid')
    .select('*')
  const data: any = updated?.[0]
  if (!data) return false
  const tracking: any = data.tracking_json || {}
  const amountCents = Number(data.amount) || 0
  try {
    const { sendFbPurchase } = await import('@/lib/fb-capi.server')
    await sendFbPurchase({
      eventId: transactionId, value: amountCents / 100, currency: 'MXN',
      eventSourceUrl: tracking.event_source_url || undefined,
      customer: { name: data.customer_name || undefined, email: data.customer_email || undefined, phone: data.customer_phone || undefined, ip: data.customer_ip || undefined, userAgent: tracking.user_agent || undefined },
      fbp: tracking.fbp || undefined, fbc: tracking.fbc || undefined, externalId: data.customer_email || undefined,
    } as any)
  } catch (e) { console.error('[fb-capi]', e) }
  try {
    const { sendUtmifyOrder } = await import('@/lib/utmify.server')
    await sendUtmifyOrder({
      orderId: transactionId, status: 'paid', amountCents, platform: 'XPag',
      customer: { name: data.customer_name || 'Cliente', email: data.customer_email || 'cliente@gmail.com', phone: data.customer_phone || undefined, ip: data.customer_ip || undefined } as any,
      product: { id: 'KIT CELIMAX', name: 'KIT CELIMAX', quantity: 1, priceCents: amountCents },
      trackingParameters: tracking,
    })
  } catch (e) { console.error('[utmify]', e) }
  try {
    const { notifyVendaPaga } = await import('@/lib/pushcut.server')
    await notifyVendaPaga(amountCents)
  } catch (e) { console.error('[pushcut]', e) }
  return true
}
