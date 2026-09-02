import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';
import { localApi } from './server/dev';
export default defineConfig({
  plugins: [react(), localApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { watch: { usePolling: true } },
  build: { outDir: 'dist/client', chunkSizeWarningLimit: 1500 },
});
