import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  preview: {
    port: 8081,
  },
  server: {
    allowedHosts: ['old-dashboard.my-dev-everpro.id', 'chat-dash-dev.everpro.id'],
  },
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'My Music Player',
        short_name: 'MyMusicPlayer',
        description: 'Music Player',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        screenshots: [
          {
            src: 'source/ss.png',
            sizes: '923x1065',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Wonder Widgets',
          },
          {
            src: 'source/ss.png',
            sizes: '923x1065',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Wonder Widgets',
          },
        ],
        icons: [
          {
            src: 'public/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'public/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'public/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'public/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
