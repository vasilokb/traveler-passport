import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@app': path.resolve(process.cwd(), 'src/app'),
      '@widgets': path.resolve(process.cwd(), 'src/widgets'),
      '@features': path.resolve(process.cwd(), 'src/features'),
      '@entities': path.resolve(process.cwd(), 'src/entities'),
      '@shared': path.resolve(process.cwd(), 'src/shared'),
      '@lib': path.resolve(process.cwd(), 'src/lib'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  publicDir: 'public',
});
