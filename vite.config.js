import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // crucial for relative paths when hosted
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
