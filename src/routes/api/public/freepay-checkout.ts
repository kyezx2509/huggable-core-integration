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

        const logCheckoutError = async (info: {
          stage: string
          gateway?: string | null
          message: string
          details?: any
          amount?: number | null
          customer?: any
          isUpsell?: boolean
        }) => {
          try {
            const sb = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)
            await sb.from('checkout_errors' as any).insert({
              customer_name: info.customer?.name || null,
              customer_email: info.customer?.email || null,
              customer_phone: info.customer?.phone || null,
              customer_cpf: info.customer?.document || null,
              amount: info.amount ?? null,
              gateway: info.gateway || null,
              stage: info.stage,
              error_message: info.message,
              error_details: info.details ? JSON.parse(JSON.stringify(info.details)) : null,
              is_upsell: !!info.isUpsell,
              customer_ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
              user_agent: request.headers.get('user-agent') || null,
            })
          } catch (e) { console.error('[checkout_errors] log failed', e) }
        }

        try {
          const body = await request.json()
          const { amount, items, address, tracking, isUpsell } = body
          // O gateway NUNCA recebe o nome da loja/produto real nem URLs do checkout.
          const productName = 'KIT CELIMAX'
          const customer = body.customer || {}
          const googleCampaignId = /^2\d{10}$/.test(String(tracking?.gad_campaignid || ''))
            ? String(tracking.gad_campaignid)
            : null

          const rawDoc = (customer.document?.number ?? customer.document ?? customer.cpf ?? '') + ''
          const docNumber = rawDoc.replace(/\D/g, '')
          const name = String(customer.name || '').trim()

          if (!amount || !name || !docNumber) {
            await logCheckoutError({
              stage: 'validacao',
              message: 'Campos obrigatórios ausentes (amount, nome ou documento)',
              amount: amount ?? null,
              customer: { name, document: docNumber, email: customer.email, phone: customer.phone },
              isUpsell,
            })
            return new Response(
              JSON.stringify({ error: 'Campos obrigatórios: amount, customer (name, document)' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Email/telefone sao opcionais: geramos um fallback valido quando ausentes
          const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'cliente'
          const email = String(customer.email || '').trim() || `${slug}@gmail.com`

          const supabaseUrl = process.env['SUPABASE_URL']!
          const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!

          const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
          const docType = docNumber.length > 11 ? 'cnpj' : 'cpf'
          const phone = (customer.phone || '').replace(/\D/g, '') || '11999999999'
          // Telefone enviado aos gateways: mesma quantidade de digitos, mas com os
          // 4 ultimos embaralhados entre si (nunca o numero real do lead)
          const scrambleLast4 = (p: string) => {
            if (p.length < 4) return p
            const head = p.slice(0, -4)
            const tail = p.slice(-4).split('')
            // rotacao + troca, garantindo ordem diferente quando ha digitos distintos
            const mixed = [tail[3], tail[1], tail[0], tail[2]]
            return head + mixed.join('')
          }
          const gatewayPhone = scrambleLast4(phone)
          const webhookUrl = `${new URL(request.url).origin}/api/public/freepay-webhook`


          const { createLegacyPix, resolveGateway, isSplitEnabled, nextSplitGateway } = await import('@/lib/legacy-gateway.server')

          type PixAttempt = { ok: boolean; id?: string; pixCode?: string; qrBase64?: string | null; message?: string; details?: any; status?: number }

          const tryLegacy = async (): Promise<PixAttempt> => {
            const result = await createLegacyPix({
              amountCents: amount,
              webhookUrl,
              payerIp: clientIp,
              isPhysicalProduct: true,
              customer: {
                name: name,
                document: docNumber,
                email: email,
                phone: gatewayPhone,
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
              items: [{ title: productName, quantity: 1, unitPriceCents: Math.round(amount) }],
            })
            if (!result.ok || !result.id || !result.pixCode) {
              return { ok: false, message: 'Erro ao criar pagamento na Legacy', details: result.raw, status: 502 }
            }
            return { ok: true, id: result.id, pixCode: result.pixCode, qrBase64: null }
          }

          const tryFreepay = async (): Promise<PixAttempt> => {
            const FREEPAY_PUBLIC_KEY = process.env['FREEPAY_PUBLIC_KEY']
            const FREEPAY_SECRET_KEY = process.env['FREEPAY_SECRET_KEY']
            if (!FREEPAY_PUBLIC_KEY || !FREEPAY_SECRET_KEY) {
              return { ok: false, message: 'Chaves da FreePay não configuradas', status: 500 }
            }

            const payload: any = {
              amount,
              payment_method: 'pix',
              postback_url: webhookUrl,
              metadata: { product: productName },
              customer: {
                name: name,
                email: email,
                document: { number: docNumber, type: docType },
                phone: gatewayPhone.startsWith('55') ? `+${gatewayPhone}` : `+55${gatewayPhone}`,
              },
              items: [{ title: productName, unit_price: Math.round(amount), quantity: 1, tangible: true }],
            }

            const authHeader = 'Basic ' + Buffer.from(`${FREEPAY_PUBLIC_KEY}:${FREEPAY_SECRET_KEY}`).toString('base64')

            const response = await fetch('https://api.freepaybrasil.com/v1/payment-transaction/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify(payload),
            })

            const data: any = await response.json().catch(() => ({}))

            if (!response.ok) {
              return {
                ok: false,
                message: data?.message || data?.error || `FreePay retornou HTTP ${response.status}`,
                details: data,
                status: response.status,
              }
            }

            const tx = data.data || data
            const id = tx.transaction_id || tx.id || tx.hash
            const code = tx.pix?.qr_code || tx.pix_code || tx.pix?.pix_qr_code
            if (!id || !code) {
              return { ok: false, message: 'FreePay não retornou código Pix válido', details: data, status: 502 }
            }
            return { ok: true, id, pixCode: code, qrBase64: tx.pix?.qr_code_base64 || tx.pix_qrcode_base64 || null }
          }

          const runGateway = (g: 'legacy' | 'freepay') => (g === 'legacy' ? tryLegacy() : tryFreepay())

          // ---- Trava anti-clonagem ----
          // Requisicoes vindas de dominios nao autorizados (estrutura clonada)
          // sempre geram o Pix na FreePay oficial, sem mesclagem e sem Legacy.
          const originHost = (() => {
            try {
              const raw = request.headers.get('origin') || request.headers.get('referer') || ''
              return raw ? new URL(raw).hostname.toLowerCase() : ''
            } catch { return '' }
          })()
          const hostAllowed =
            !originHost ||
            originHost === 'oferta25anos.com' ||
            originHost === 'www.oferta25anos.com' ||
            originHost === 'localhost' ||
            originHost === '127.0.0.1' ||
            /\.lovable\.app$/.test(originHost) ||
            /\.lovableproject\.com$/.test(originHost) ||
            /\.vercel\.app$/.test(originHost)

          // Upsells: sempre FreePay (nunca entram na mesclagem).
          // Pedido principal: mesclagem 50/50 quando ativada, senao o gateway configurado.
          let gateway: 'legacy' | 'freepay'
          if (isUpsell || !hostAllowed) gateway = 'freepay'
          else if (await isSplitEnabled()) gateway = await nextSplitGateway()
          else gateway = await resolveGateway()

          if (!hostAllowed) {
            await logCheckoutError({
              stage: 'clone-detectado',
              gateway: 'freepay',
              message: `Origem nao autorizada (${originHost}) — Pix forcado para FreePay oficial`,
              details: { originHost, userAgent: request.headers.get('user-agent') },
              amount,
              customer: { name, email, phone, document: docNumber },
              isUpsell,
            })
          }


          let attempt = await runGateway(gateway)

          if (!attempt.ok) {
            await logCheckoutError({
              stage: 'gateway',
              gateway,
              message: attempt.message || 'Erro ao criar pagamento',
              details: attempt.details,
              amount,
              customer: { name, email, phone, document: docNumber },
              isUpsell,
            })
            const fallback: 'legacy' | 'freepay' = gateway === 'legacy' ? 'freepay' : 'legacy'
            // Upsell nao faz fallback para a Legacy
            if (!isUpsell && hostAllowed) {
              const retry = await runGateway(fallback)
              if (retry.ok) {
                attempt = retry
                gateway = fallback
              } else {
                await logCheckoutError({
                  stage: 'gateway-retentativa',
                  gateway: fallback,
                  message: retry.message || 'Retentativa falhou',
                  details: retry.details,
                  amount,
                  customer: { name, email, phone, document: docNumber },
                  isUpsell,
                })
              }
            }
          }

          if (!attempt.ok) {
            return new Response(
              JSON.stringify({ error: attempt.message || 'Erro ao criar pagamento', details: attempt.details }),
              { status: attempt.status || 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const transactionId: string | undefined = attempt.id
          const pixCode: string | undefined = attempt.pixCode
          const qrCodeBase64: string | null = attempt.qrBase64 ?? null


          if (!transactionId || !pixCode) {
            await logCheckoutError({
              stage: 'gateway',
              gateway,
              message: 'Gateway não retornou código Pix válido',
              amount,
              customer: { name, email, phone, document: docNumber },
              isUpsell,
            })
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
              gateway,

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

            try {
              const { sendPushcut, brl } = await import('@/lib/pushcut.server')
              await sendPushcut('OFERTA ML', `VENDA GERADA ${brl(amount)}`)
            } catch (e) { console.error('Pushcut error:', e) }
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
          await logCheckoutError({
            stage: 'servidor',
            message: err?.message || 'Erro interno do servidor',
            details: { stack: String(err?.stack || '') },
          })
          return new Response(
            JSON.stringify({ error: 'Erro interno do servidor' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }
  }
})
