import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    strictPort: false,       // allow fallback port if 5173 is busy
    host: true,              // 0.0.0.0 — listen on all interfaces (Wi-Fi, Ethernet, IPv4, IPv6)
  },
  preview: {
    port: 5173,
    strictPort: false,
    host: true,              // same for preview server
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-ui':     ['lucide-react', 'react-hot-toast'],
        },
      },
    },
  },
  // ── Vitest configuration ──────────────────────────────────────────────────
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./src/tests/setup.js'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'html'],
      include:   ['src/**/*.{js,jsx}'],
      exclude:   ['src/main.jsx', 'src/utils/mockData.js'],
    },
  },
})
