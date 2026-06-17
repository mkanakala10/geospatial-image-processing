import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Set BASE to your GitHub repo name when deploying to GitHub Pages.
// e.g., if your repo is github.com/user/geospatial-saas, set base: '/geospatial-saas/'
// For a custom domain or user/org page at root, leave as '/'
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // In Docker: VITE_DEV_PROXY_TARGET=http://api:8000
        // On host: defaults to localhost:8000
        target: process.env.VITE_DEV_PROXY_TARGET || process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          map: ['leaflet', 'react-leaflet'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
        },
      },
    },
  },
})
