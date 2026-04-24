import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Devuelve '/index.html' si es una navegación de browser (refresh/acceso directo)
// para que Vite sirva la SPA en lugar de proxiar al backend.
// Las llamadas axios usan Accept: application/json, no text/html.
function spaBypass(req: { headers: Record<string, string | string[] | undefined> }) {
  const accept = req.headers['accept'] ?? ''
  if (Array.isArray(accept) ? accept[0]?.startsWith('text/html') : accept.startsWith('text/html')) {
    return '/index.html'
  }
}

const API_PROXY = {
  target: 'http://localhost:3000',
  changeOrigin: true,
  bypass: spaBypass,
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['professed-patly-dot.ngrok-free.dev'],
    proxy: {
      '/auth': API_PROXY,
      '/my-library': API_PROXY,
      '/comics': API_PROXY,
      '/collections': API_PROXY,
      '/users': API_PROXY,
      '/gcd': API_PROXY,
      '/series': API_PROXY,
      '/ai': API_PROXY,
      '/external-search': API_PROXY,
      '/isbndb': API_PROXY,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
