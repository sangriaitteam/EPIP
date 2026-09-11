import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
  },
  preview: {
    port: 5173,
    strictPort: true,
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
