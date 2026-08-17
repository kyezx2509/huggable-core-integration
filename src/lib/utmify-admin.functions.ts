import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendUtmifyOrder } from "./utmify.server";

export const resendToUtmify = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ transactionIds: z.array(z.string()) }).parse(data))
  .handler(async ({ data }) => {
    try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '', 
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
      
      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .in('transaction_id', data.transactionIds);

      if (error) {
        console.error('[resendToUtmify] db error:', error);
        throw new Error(error.message);
      }
      
      if (!transactions || transactions.length === 0) {
        return [];
      }

      const results = [];
      for (const tx of transactions) {
        try {
          const items = Array.isArray(tx.items_json) ? tx.items_json as any[] : [];
          const tracking = (tx.tracking_json as any) || {};
          
          const res = await sendUtmifyOrder({
            orderId: String(tx.transaction_id),
            status: tx.status === 'paid' ? 'paid' : 'waiting_payment',
            amountCents: Number(tx.amount),
            platform: tx.gateway === 'legacy' ? 'Legacy' : 'FreePay',
            customer: {
              name: tx.customer_name || 'Cliente',
              email: tx.customer_email || 'cliente@gmail.com',
              document: tx.customer_cpf,
              phone: tx.customer_phone,
              ip: tx.customer_ip,
            },
            product: {
              id: items[0]?.name || 'produto',
              name: items[0]?.name || 'Produto',
              quantity: items[0]?.quantity || 1,
              priceCents: Number(tx.amount),
            },
            trackingParameters: tracking,
          });
          results.push({ id: tx.transaction_id, ok: res.ok });
        } catch (txErr) {
          console.error(`[resendToUtmify] error processing tx ${tx.transaction_id}:`, txErr);
          results.push({ id: tx.transaction_id, ok: false });
        }
      }

      return results;
    } catch (globalErr: any) {
      console.error('[resendToUtmify] global error:', globalErr);
      throw new Error(globalErr.message || "Erro interno no servidor");
    }
  });
