import { createFileRoute } from '@tanstack/react-router'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export const Route = createFileRoute('/api/public/geo')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
        }),
      GET: async ({ request }) => {
        const h = request.headers
        const country =
          h.get('cf-ipcountry') ||
          h.get('x-vercel-ip-country') ||
          h.get('x-country-code') ||
          h.get('x-geo-country') ||
          ''
        const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
        return new Response(
          JSON.stringify({ country: country.toUpperCase() || null, ip }),
          { headers: cors }
        )
      },
    },
  },
})
