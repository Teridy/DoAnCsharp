import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 6173 },
  plugins: [react()],
   optimizeDeps: {
    include: ['leaflet', 'react-leaflet']  // ✅ thêm dòng này
  }
})
