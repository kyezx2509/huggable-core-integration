import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/public/freepay-checkout')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Max-Age': '86400',
          },
        }),
      POST: async ({ request }) => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }

        try {
          const body = await request.json()
          const { amount, items, address, productName, tracking, isUpsell } = body
          const customer = body.customer || {}
          const googleCampaignId = /^2\d{10}$/.test(String(tracking?.gad_campaignid || ''))
            ? String(tracking.gad_campaignid)
            : null

          const rawDoc = (customer.document?.number ?? customer.document ?? customer.cpf ?? '') + ''
          const docNumber = rawDoc.replace(/\D/g, '')
          const name = String(customer.name || '').trim()

          if (!amount || !name || !docNumber) {
            return new Response(
              JSON.stringify({ error: 'Campos obrigatórios: amount, customer (name, document)' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Email/telefone sao opcionais: geramos um fallback valido quando ausentes
          const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'cliente'
          const email = String(customer.email || '').trim() || `${slug}@gmail.com`

          const supabaseUrl = process.env.SUPABASE_URL!
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

          const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
          const docType = docNumber.length > 11 ? 'cnpj' : 'cpf'
          const phone = (customer.phone || '').replace(/\D/g, '') || '11999999999'
          const webhookUrl = `${new URL(request.url).origin}/api/public/freepay-webhook`

          const { createLegacyPix, resolveGateway } = await import('@/lib/legacy-gateway.server')
          // Upsells sempre pela FreePay; pedido principal segue o gateway configurado (Legacy por padrao)
          const gateway = isUpsell ? 'freepay' : await resolveGateway()

          let transactionId: string | undefined
          let pixCode: string | undefined
          let qrCodeBase64: string | null = null

          if (gateway === 'legacy') {
            const result = await createLegacyPix({
              amountCents: amount,
              webhookUrl,
              payerIp: clientIp,
              isPhysicalProduct: true,
              customer: {
                name: name,
                document: docNumber,
                email: email,
                phone,
                address: address
                  ? {
                      street: address.street || address.rua || address.logradouro,
                      number: address.number || address.numero,
                      zipCode: address.zipCode || address.cep,
                      city: address.city || address.cidade,
                      state: address.state || address.estado || address.uf,
                    }
                  : null,
              },
              items: (items || []).map((it: any) => ({
                title: it.name || it.title || productName || 'Produto',
                quantity: it.quantity || 1,
                unitPriceCents: Math.round((it.price || it.unit_price || amount / 100) * 100),
              })),
            })
            if (!result.ok) {
              return new Response(
                JSON.stringify({ error: 'Erro ao criar pagamento', details: result.raw }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            transactionId = result.id
            pixCode = result.pixCode
          } else {
            const FREEPAY_PUBLIC_KEY = process.env.FREEPAY_PUBLIC_KEY
            const FREEPAY_SECRET_KEY = process.env.FREEPAY_SECRET_KEY
            if (!FREEPAY_PUBLIC_KEY || !FREEPAY_SECRET_KEY) {
              return new Response(
                JSON.stringify({ error: 'Chaves da FreePay não configuradas' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            const payload: any = {
              amount,
              payment_method: 'pix',
              postback_url: webhookUrl,
              customer: {
                name: name,
                email: email,
                document: { number: docNumber, type: docType },
                phone: phone.startsWith('55') ? `+${phone}` : `+55${phone}`,
              },
              items: (items || []).map((it: any) => ({
                title: it.name || it.title || 'Produto',
                unit_price: Math.round((it.price || it.unit_price || (amount / 100)) * 100),
                quantity: it.quantity || 1,
                tangible: true,
              })),
              metadata: { product: productName || 'Produto', ip: clientIp },
            }

            const authHeader = 'Basic ' + Buffer.from(`${FREEPAY_PUBLIC_KEY}:${FREEPAY_SECRET_KEY}`).toString('base64')

            const response = await fetch('https://api.freepaybrasil.com/v1/payment-transaction/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (!response.ok) {
              console.error('FreePay error:', data)
              return new Response(
                JSON.stringify({ error: 'Erro ao criar pagamento FreePay', details: data }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            const tx = data.data || data
            transactionId = tx.transaction_id || tx.id || tx.hash
            pixCode = tx.pix?.qr_code || tx.pix_code || tx.pix?.pix_qr_code
            qrCodeBase64 = tx.pix?.qr_code_base64 || tx.pix_qrcode_base64 || null
          }

          const supabase = createClient(supabaseUrl, serviceRoleKey)


          if (transactionId) {
            await supabase.from('payment_transactions').insert({
              transaction_id: String(transactionId),
              status: 'pending',
              amount,
              customer_name: name,
              customer_email: email,
              customer_phone: customer.phone || phone,
              customer_cpf: docNumber,
              customer_address: address || null,
              items_json: items || null,
              payment_method: 'pix',
              customer_ip: clientIp,
              tracking_json: {
                ...(tracking || {}),
                gad_campaignid: googleCampaignId,
                utm_campaign: tracking?.utm_campaign || googleCampaignId || null,
                utm_content: tracking?.utm_content || tracking?.ad_id || null,
                utm_term: tracking?.utm_term || tracking?.adgroup_id || null,
                user_agent: request.headers.get('user-agent') || null,
              },

            })

            // Notifica Utmify (pedido gerado - waiting_payment)
            try {
              const { sendUtmifyOrder } = await import('@/lib/utmify.server')
              await sendUtmifyOrder({
                orderId: String(transactionId),
                status: 'waiting_payment',
                amountCents: amount,
                platform: gateway === 'legacy' ? 'Legacy' : 'FreePay',
                customer: {
                  name: name,
                  email: email,
                  document: docNumber,
                  phone,
                  ip: clientIp,
                },
                product: {
                  id: productName || 'produto',
                  name: productName || 'Produto',
                  quantity: (items?.[0]?.quantity) || 1,
                  priceCents: amount,
                },
                trackingParameters: tracking || {},
              })
            } catch (e) { console.error('[utmify] checkout notify failed', e) }

            if (process.env.PUSHCUT_WEBHOOK_URL) {
              await fetch(process.env.PUSHCUT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: 'Pix Gerado',
                  text: `R$ ${(amount / 100).toLocaleString('pt-BR')} - ${productName || name}`,
                  sound: 'cash_register'
                })
              }).catch(e => console.error('Pushcut error:', e))
            }
          }

          const pixData = {
            qr_code: pixCode,
            qr_code_base64: qrCodeBase64,
            copy_paste: pixCode,
            id: transactionId
          }


          return new Response(
            JSON.stringify({ success: true, data: { pix: pixData, id: transactionId } }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (err: any) {
          console.error('Checkout error:', err)
          return new Response(
            JSON.stringify({ error: 'Erro interno do servidor' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }
  }
})
