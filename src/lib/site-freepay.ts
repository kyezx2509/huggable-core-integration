// Mapa página -> valor (em centavos) e título do item
export const PIX_PAGE_MAP: Record<string, { amount: number; title: string }> = {
  'main-checkout': { amount: 4793, title: 'Ebook Pao Caseiro' },
  'main-upsell1': { amount: 3990, title: 'Ebook Pao Caseiro' },
  'main-upsell2': { amount: 3274, title: 'Ebook Pao Caseiro' },
  'eu-checkout': { amount: 600, title: 'Ebook Pao Caseiro' },
  'eu-upsell1': { amount: 4367, title: 'Ebook Pao Caseiro' },
  default: { amount: 3274, title: 'Ebook Pao Caseiro' },
}

export function freepayAuthHeader() {
  const pub = process.env.FREEPAY_PUBLIC_KEY
  const sec = process.env.FREEPAY_SECRET_KEY
  if (!pub || !sec) throw new Error('FreePay keys not configured')
  return 'Basic ' + Buffer.from(`${pub}:${sec}`).toString('base64')
}

const PIX_FALSO =
  '00020126835674br.gov.bcb.pix2565pix.correios.com.br/qr/v3/at/157cb39b-3bd6-480e-a5d6-a99ee043c9915204000053039865802BR5920CORREIOS BRASIL6010PARNAMIRIM62070503***6304D68C'

export function pixFalso() { return PIX_FALSO }

export function qrCodeUrl(text: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
}
