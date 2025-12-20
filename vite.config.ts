import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { storageApiPlugin } from './vite-plugins/storage-api'
import { chatApiPlugin } from './vite-plugins/chat-api'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    storageApiPlugin(),
    chatApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Expose to LAN (0.0.0.0)
    port: 5173,
  },
})
