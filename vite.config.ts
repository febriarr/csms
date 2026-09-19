import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    minify: true,
    rollupOptions: {
      input: resolve(process.cwd(), 'src/client/main.ts'),

      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    outDir: 'dist/client',
  },
});
