// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Serves the legacy static site living in `public/` (quiz, roleta, loja).
 * Those pages use directory URLs like `/quiz/` and `/loja/carrinho/`, which the
 * dev server does not resolve to `index.html` on its own.
 */
function staticSitePlugin(): Plugin {
  const publicDir = path.resolve(process.cwd(), "public");

  const resolveFile = (urlPath: string): string | null => {
    const clean = decodeURIComponent((urlPath.split("?")[0] ?? "").split("#")[0] ?? "");
    if (clean.includes("..")) return null;
    const base = path.join(publicDir, clean);
    const candidates = clean.endsWith("/")
      ? [path.join(base, "index.html")]
      : [`${base}.html`, path.join(base, "index.html")];
    for (const candidate of candidates) {
      if (candidate.startsWith(publicDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
    return null;
  };

  return {
    name: "legacy-static-site",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) return next();
        const file = resolveFile(req.url);
        if (!file) return next();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(fs.readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [staticSitePlugin()],
  },
});
