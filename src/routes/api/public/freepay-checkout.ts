import { createFileRoute } from '@tanstack/react-router'
import { corsPreflight, handleXpagCheckout } from '@/lib/xpag-checkout.server'

// Ruta antigua mantenida por compatibilidad: ahora todo se procesa en XPag (MXN).
export const Route = createFileRoute('/api/public/freepay-checkout')({
  server: { handlers: { OPTIONS: async () => corsPreflight(), POST: async ({ request }) => handleXpagCheckout(request) } },
})
