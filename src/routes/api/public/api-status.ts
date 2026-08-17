import { createFileRoute } from '@tanstack/react-router'

const TEST_CPF = '00000000272'
const TIMEOUT = 8000

const SEARCHAPI_TOKENS = ['2077','2733','3684','3882','4097','4707','5621','5717','6441','7009','7499','7903','8301','8356','8706','9309']

type Result = { id: string; label: string; url: string; ok: boolean; status?: number; ms: number; message?: string; sample?: string }

function pickString(v: any) { return typeof v === 'string' ? v.trim() : '' }
function findName(payload: any): string {
  const c = [payload?.DADOS?.nome, payload?.DADOS?.NOME, payload?.dados?.nome, payload?.dados?.NOME, payload?.data?.nome, payload?.data?.NOME, payload?.result?.nome, payload?.result?.NOME, payload?.nome, payload?.NOME]
  for (const x of c) { const s = pickString(x); if (s) return s }
  if (Array.isArray(payload)) for (const it of payload) { const n = findName(it); if (n) return n }
  if (payload && typeof payload === 'object') {
    for (const k of Object.keys(payload)) { const n = findName(payload[k]); if (n) return n }
  }
  return ''
}

async function check(id: string, label: string, url: string): Promise<Result> {
  const start = Date.now()
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT) })
    const ms = Date.now() - start
    const text = await r.text()
    let json: any = {}
    try { json = JSON.parse(text) } catch {}
    const name = findName(json)
    const ok = r.ok && !!name
    return { id, label, url: url.replace(/token[^&]*/gi, 'token=***').replace(/api[_-]?key=[^&]*/gi, 'api_key=***'), ok, status: r.status, ms, sample: name || (text.slice(0, 120)), message: ok ? undefined : (!r.ok ? `HTTP ${r.status}` : 'sem nome') }
  } catch (e: any) {
    return { id, label, url, ok: false, ms: Date.now() - start, message: e?.message || 'erro' }
  }
}

export const Route = createFileRoute('/api/public/api-status')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Max-Age': '86400',
          },
        }),
      GET: async () => {
        const cpf = TEST_CPF
        const targets: { id: string; label: string; url: string }[] = [
          ...SEARCHAPI_TOKENS.map((tk, i) => ({
            id: `searchapi-${tk}`,
            label: `SearchAPI token ${tk}`,
            url: `https://searchapi.it.com/consulta?cpf=${cpf}&token_api=${tk}`,
          })),
          { id: 'amnesia', label: 'Amnesia Tecnologia (backup 1)', url: `https://api.amnesiatecnologia.lat/?token=cf1498a4-750c-4027-97ad-a4c70e98cfa3&cpf=${cpf}` },
          { id: 'databit', label: 'Databit (backup 2)', url: `https://databit.online/api?token=9c2b3055-4640-451f-8182-e8804ca1c0a6&type=cpftype&query=${cpf}` },
        ]

        const results = await Promise.all(targets.map(t => check(t.id, t.label, t.url)))
        return new Response(JSON.stringify({ checked_at: new Date().toISOString(), test_cpf: cpf, results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
        })
      },
    },
  },
})
