/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Ensure SW and manifest are copied to dist
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  // Dev server
  server: {
    port: 3000,
    host: true,
  },
  // PWA: copy public files including sw.js
  publicDir: 'public',
})
