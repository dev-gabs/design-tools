import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cross-origin isolation lets the AI selection run multi-threaded on CPU. In production sw.js adds
// these headers (GitHub Pages cannot); in dev a middleware does, because `server.headers` skips
// worker scripts. `vite preview` gets none, so it behaves like GitHub Pages.
const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

const crossOriginIsolation = (): Plugin => ({
  name: 'cross-origin-isolation',
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      for (const [key, value] of Object.entries(ISOLATION_HEADERS)) res.setHeader(key, value)
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), crossOriginIsolation()],
  base: './', // Ensures relative paths for GitHub Pages without blank page 404s
  // The AI selection worker imports transformers.js, which needs code-splitting inside the worker
  worker: { format: 'es' },
})
