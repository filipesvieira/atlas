import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Mantém uma URL local única. Caso uma instância antiga ainda esteja usando
    // a porta, o Vite falha de forma explícita em vez de subir silenciosamente
    // em 3001 e deixar o navegador aberto no servidor antigo.
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
