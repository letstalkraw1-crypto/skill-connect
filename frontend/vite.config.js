import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
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
      '/auth': 'http://localhost:5000',
      '/profile': 'http://localhost:5000',
      '/discover': 'http://localhost:5000',
      '/connections': 'http://localhost:5000',
      '/conversations': 'http://localhost:5000',
      '/posts': 'http://localhost:5000',
      '/events': 'http://localhost:5000',
      '/communities': 'http://localhost:5000',
      '/resources': 'http://localhost:5000',
      '/challenges': 'http://localhost:5000',
      '/qa': 'http://localhost:5000',
      '/documents': 'http://localhost:5000',
      '/admin': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
