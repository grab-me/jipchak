import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // local build path as per convention
  server: {
    host: true, // 외부 접속 허용 (Network 주소 노출)
    port: 5173, // 포트 고정
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
