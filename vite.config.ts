// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Valores PÚBLICOS (chave publicável) usados como reserva quando o build roda sem .env,
// evitando o erro "Missing Supabase environment variable(s)" no site publicado.
const PUBLIC_BACKEND_URL = process.env.VITE_SUPABASE_URL || "https://tlqtagyucifidozkuadj.supabase.co";
const PUBLIC_BACKEND_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_csj8J8qgUkbmNwFgTBAykA_ObAJY_YK";
const PUBLIC_BACKEND_ID = process.env.VITE_SUPABASE_PROJECT_ID || "tlqtagyucifidozkuadj";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_BACKEND_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_BACKEND_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(PUBLIC_BACKEND_ID),
    },
  },
});
