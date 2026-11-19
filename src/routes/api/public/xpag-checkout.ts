import { createFileRoute } from '@tanstack/react-router'
import { corsPreflight, handleXpagCheckout } from '@/lib/xpag-checkout.server'

export const Route = createFileRoute('/api/public/xpag-checkout')({
  server: { handlers: { OPTIONS: async () => corsPreflight(), POST: async ({ request }) => handleXpagCheckout(request) } },
})
