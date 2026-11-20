// Cotacao MXN -> BRL compartilhada (cache 6h, fallback fixo se a API falhar).
// Usada pelo Pushcut (mostra o valor em R$) e pelo Purchase do Facebook/Meta
// (o evento de compra e disparado em reais, como o anuncio roda no Brasil).

const FALLBACK_MXN_BRL = 0.29

let rateCache: { v: number; t: number } | null = null

export async function mxnToBrlRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.t < 6 * 3600_000) return rateCache.v
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/MXN', { signal: AbortSignal.timeout(4000) })
    const j: any = await r.json()
    const v = Number(j?.rates?.BRL)
    if (v > 0) {
      rateCache = { v, t: Date.now() }
      return v
    }
  } catch (e) {
    console.warn('[fx] cotacao falhou', e)
  }
  return FALLBACK_MXN_BRL
}

/** Centavos de MXN -> valor em reais (numero puro, ex: 554.64). */
export async function mxnCentsToBrl(cents: number): Promise<number> {
  const reais = (Number(cents || 0) / 100) * (await mxnToBrlRate())
  return Number(reais.toFixed(2))
}

/** Centavos de MXN -> "R$ 1.234,56". */
export async function brl(cents: number): Promise<string> {
  const reais = await mxnCentsToBrl(cents)
  return 'R$ ' + reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
