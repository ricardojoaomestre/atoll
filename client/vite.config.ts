import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiOrigin = process.env.ATOLL_API_ORIGIN ?? 'http://127.0.0.1:8787'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.ATOLL_UI_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': {
        target: apiOrigin,
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: apiOrigin,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
