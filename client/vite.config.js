import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          if (normalized.includes('/node_modules/')) {
            if (normalized.includes('/three/') || normalized.includes('/@react-three/')) {
              return 'vendor-three';
            }
            if (normalized.includes('/leaflet/')) {
              return 'vendor-leaflet';
            }
            if (
              normalized.includes('/motion/') ||
              normalized.includes('/framer-motion/') ||
              normalized.includes('/lenis/')
            ) {
              return 'vendor-motion';
            }
            if (normalized.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            if (
              normalized.includes('/react-router') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react/') ||
              normalized.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
          }

          if (normalized.includes('/src/i18n/translations')) {
            return 'app-i18n';
          }
          if (
            normalized.includes('/src/lib/api.js') ||
            normalized.includes('/src/lib/catalogService.js') ||
            normalized.includes('/src/lib/curatedTrips.js')
          ) {
            return 'app-catalog';
          }

          return undefined;
        },
      },
    },
  },
});
