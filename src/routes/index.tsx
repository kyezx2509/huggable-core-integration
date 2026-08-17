import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Promoção Mercado Livre — Gire a Roleta e Ganhe" },
      {
        name: "description",
        content:
          "Participe do quiz, gire a roleta e desbloqueie ofertas exclusivas com preços promocionais em eletrônicos, eletrodomésticos e muito mais.",
      },
      { property: "og:title", content: "Promoção Mercado Livre — Gire a Roleta e Ganhe" },
      {
        property: "og:description",
        content:
          "Responda ao quiz rápido, gire a roleta e acesse a loja com descontos exclusivos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/quiz/" + window.location.search);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}
