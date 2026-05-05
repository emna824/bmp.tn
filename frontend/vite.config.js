import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (
            id.includes('face-api.js') ||
            id.includes('react-webcam') ||
            id.includes('@tensorflow')
          ) return 'face-auth'
          if (id.includes('react-big-calendar')) return 'calendar'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@tanstack/react-query')) return 'react-query'
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
