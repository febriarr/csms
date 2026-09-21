import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import fullReload from 'vite-plugin-full-reload';

export default defineConfig({
  base: '/client/',
  plugins: [fullReload(['src/views/**/*.ejs'])],

  server: {
    port: 5173,
    hmr: true,
  },

  build: {
    minify: true,
    manifest: true,

    rollupOptions: {
      input: resolve(process.cwd(), 'src/client/main.ts'),

      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    outDir: 'dist/client',
  },
});
