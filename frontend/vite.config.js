import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-big-calendar')) return 'calendar'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          if (id.includes('axios') || id.includes('date-fns')) return 'vendor-utils'
          return 'vendor'
        },
      },
    },
  },
  server: {
    host: true, // allow external access
    allowedHosts: [
      "undejectedly-unlaminated-allena.ngrok-free.dev"
    ],

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
