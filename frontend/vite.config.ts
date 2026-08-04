import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-scroll': ['gsap', 'lenis'],
          // Only the design viewer pulls this in, and it dwarfs everything
          // else — keep it in a chunk the rest of the app never fetches.
          'vendor-three': ['three'],
        },
      },
    },
  },
  server: {
    // Bind to 0.0.0.0 so the dev server is reachable from other devices on the LAN.
    host: true,
    port: 5173,
    open: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
