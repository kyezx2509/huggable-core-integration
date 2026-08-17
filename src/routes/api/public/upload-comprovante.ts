import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const Route = createFileRoute('/api/public/upload-comprovante')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const form = await request.formData()
          const file = form.get('file') as File | null
          const transactionId = String(form.get('transaction_id') || '')
          if (!file || !transactionId) {
            return new Response(JSON.stringify({ success: false, message: 'file e transaction_id obrigatórios' }), { status: 200, headers: cors })
          }
          const maxBytes = 10 * 1024 * 1024
          if (file.size > maxBytes) {
            return new Response(JSON.stringify({ success: false, message: 'Arquivo maior que 10MB' }), { status: 200, headers: cors })
          }
          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
          const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
          const path = `${transactionId}/${Date.now()}.${ext}`
          const buffer = Buffer.from(await file.arrayBuffer())
          const { error: upErr } = await sb.storage.from('comprovantes').upload(path, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          })
          if (upErr) {
            return new Response(JSON.stringify({ success: false, message: 'Erro no upload', details: upErr.message }), { status: 200, headers: cors })
          }
          await sb.from('payment_transactions').update({ comprovante_url: path, updated_at: new Date().toISOString() }).eq('transaction_id', transactionId)

          if (process.env.PUSHCUT_WEBHOOK_URL) {
            fetch(process.env.PUSHCUT_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: 'Comprovante enviado', text: `Transação ${transactionId}`, sound: 'default' }),
            }).catch(() => {})
          }

          return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
        } catch (err: any) {
          return new Response(JSON.stringify({ success: false, message: err?.message || 'Erro' }), { status: 200, headers: cors })
        }
      },
    },
  },
})
