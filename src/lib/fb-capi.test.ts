import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mxnCentsToBrl, mxnToBrlRate } from './fx.server'
import { sendFbPurchase } from './fb-capi.server'

const originalFetch = globalThis.fetch
const RATE = 0.3
let captured: Array<{ url: string; body: any }> = []

beforeEach(() => {
  captured = []
  process.env['FB_PIXEL_ID_1'] = '1071922481952543'
  process.env['FB_CAPI_TOKEN_1'] = 'test-token'
  globalThis.fetch = (async (input: any, init: any) => {
    const url = String(input)
    if (url.includes('open.er-api.com')) {
      return new Response(JSON.stringify({ rates: { BRL: RATE } }), { status: 200 })
    }
    captured.push({ url, body: JSON.parse(String(init?.body || '{}')) })
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('cotacao MXN -> BRL converte centavos em reais', async () => {
  expect(await mxnToBrlRate()).toBe(RATE)
  // $119,90 MXN -> R$ 35,97
  expect(await mxnCentsToBrl(11990)).toBe(35.97)
})

test('Purchase e enviado em BRL com o valor convertido', async () => {
  const value = await mxnCentsToBrl(11990)
  const r = await sendFbPurchase({
    eventId: 'tx-test-1',
    value,
    currency: 'BRL',
    customer: { name: 'Kawe Castro', email: 'kawe@example.com', phone: '5511999999999' },
  })

  expect(r.ok).toBe(true)
  expect(r.sent).toBeGreaterThanOrEqual(1)
  expect(captured.length).toBeGreaterThanOrEqual(1)

  // Todos os pixels configurados recebem o mesmo evento, sempre em BRL.
  for (const c of captured) {
    const event = c.body.data[0]
    expect(event.event_name).toBe('Purchase')
    expect(event.event_id).toBe('tx-test-1')
    expect(event.custom_data.currency).toBe('BRL')
    expect(event.custom_data.value).toBe(35.97)
  }
  expect(captured.some((c) => c.url.includes('1071922481952543'))).toBe(true)
})
