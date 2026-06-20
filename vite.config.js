/**
 * Vite config — Afnan storefront
 *
 * - React + PWA
 * - manualChunks: split firebase + framer-motion into their own bundles
 *   to keep the main entry chunk light on first paint.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'splash/*.mp4'],
      manifest: {
        name: 'أفنان | Afnan',
        short_name: 'Afnan',
        description: 'متجر الفساتين الجزائرية الفاخرة',
        theme_color: '#A8C5A0',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'ar',
        // The app is installed from the admin panel, so launch straight into it.
        // ProtectedRoute redirects to /admin/login when the session is signed out.
        start_url: '/admin',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
