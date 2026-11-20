import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Saat development, request /api diteruskan ke Express (npm run dev menjalankan keduanya).
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
