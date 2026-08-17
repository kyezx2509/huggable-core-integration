import { createFileRoute } from "@tanstack/react-router";
// Inline o checkout estático no build (Node dev SSR + Cloudflare Workers, sem fs).
import checkoutHtml from "../../../public/celimax/checkout.html?raw";

export const Route = createFileRoute("/checkout/")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(checkoutHtml, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
