import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // local build path as per convention
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
