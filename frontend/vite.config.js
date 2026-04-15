import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': { target: 'ws://localhost:5000', ws: true }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable source maps only in dev
    sourcemap: false,
  },
  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },
});
