import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'zustand', 'react-i18next'],
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
      '@cyberbunny/ui-web/styles': path.resolve(__dirname, '../ui-web/src/index.css'),
      '@cyberbunny/ui-web': path.resolve(__dirname, '../ui-web/src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
})
