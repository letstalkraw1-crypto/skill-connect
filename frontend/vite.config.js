import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks: {
          vendor: [] // We'll add dynamic imports later
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/profile': 'http://localhost:5000',
      '/discover': 'http://localhost:5000',
      '/connections': 'http://localhost:5000',
      '/conversations': 'http://localhost:5000',
      '/admin': 'http://localhost:5000',
      '/upload': 'http://localhost:5000',
      '/posts': 'http://localhost:5000',
      '/events': 'http://localhost:5000',
      '/communities': 'http://localhost:5000',
      '/resources': 'http://localhost:5000',
      '/challenges': 'http://localhost:5000',
      '/qa': 'http://localhost:5000',
      '/documents': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true
      }
    }
  }
});
