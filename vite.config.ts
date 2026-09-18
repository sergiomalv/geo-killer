/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages sirve el juego desde /geo-killer/, no desde la raíz del dominio.
  base: '/geo-killer/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    dir: './src',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
