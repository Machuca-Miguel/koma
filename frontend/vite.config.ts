import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/my-library': { target: 'http://localhost:3000', changeOrigin: true },
      '/comics': { target: 'http://localhost:3000', changeOrigin: true },
      '/collections': { target: 'http://localhost:3000', changeOrigin: true },
      '/users': { target: 'http://localhost:3000', changeOrigin: true },
      '/gcd': { target: 'http://localhost:3000', changeOrigin: true },
      '/series': { target: 'http://localhost:3000', changeOrigin: true },
      '/ai': { target: 'http://localhost:3000', changeOrigin: true },
      '/external-search': { target: 'http://localhost:3000', changeOrigin: true },
      '/isbndb': { target: 'http://localhost:3000', changeOrigin: true },
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
