import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Dev: proxy through mediauiprox (BFF) so auth, capabilities, userdata, and playback
// match production. Run BFF on :5174 while Vite uses :5173, e.g.:
//   mediauiprox -listen :5174 ...  (from _mvp after ./run-host.sh up)
const bff = process.env.VITE_BFF_URL || 'http://127.0.0.1:5174'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      'media-ui': resolve(__dirname, 'src/lib.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: bff, changeOrigin: true },
      '/stream': { target: bff, changeOrigin: true },
      '/images': { target: bff, changeOrigin: true },
      '/login': { target: bff, changeOrigin: true },
      '/logout': { target: bff, changeOrigin: true },
      '/auth': { target: bff, changeOrigin: true },
      '/invite': { target: bff, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist-app',
    emptyOutDir: true,
  },
})
