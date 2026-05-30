import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@open-doc/shared': path.resolve(__dirname, '../../libs/shared/src/index.ts'),
    },
  },
});
