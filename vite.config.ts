import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const requestMedia = process.env.VITE_REQUEST_MEDIA_URL || 'http://localhost:9380'
const moviesHttp = process.env.VITE_MOVIES_HTTP_URL || 'http://localhost:9430'
const tvHttp = process.env.VITE_TV_HTTP_URL || 'http://localhost:9450'

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
      '/api/search': { target: requestMedia, changeOrigin: true },
      '/api/request': { target: requestMedia, changeOrigin: true },
      '/api/requests': { target: requestMedia, changeOrigin: true },
      '/api/movies': { target: moviesHttp, changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/movies/, '/api/movies') },
      '/api/tv': { target: tvHttp, changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/tv/, '/api/tv') },
      '/api/music': { target: process.env.VITE_MUSIC_HTTP_URL || 'http://localhost:8088', changeOrigin: true },
      '/api/books': { target: process.env.VITE_BOOKS_HTTP_URL || 'http://localhost:8088', changeOrigin: true },
      '/api/comics': { target: process.env.VITE_COMICS_HTTP_URL || 'http://localhost:8088', changeOrigin: true },
      '/api/audiobooks': { target: process.env.VITE_AUDIOBOOKS_HTTP_URL || 'http://localhost:8088', changeOrigin: true },
      '/images/movies': { target: moviesHttp, changeOrigin: true, rewrite: (p) => p.replace(/^\/images\/movies/, '/images') },
      '/images/tv': { target: tvHttp, changeOrigin: true, rewrite: (p) => p.replace(/^\/images\/tv/, '/images') },
      '/stream': { target: moviesHttp, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist-app',
    emptyOutDir: true,
  },
})
