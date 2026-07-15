import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  },
  resolve: {
    alias: {
      '@app': path.resolve(process.cwd(), 'src/app'),
      '@widgets': path.resolve(process.cwd(), 'src/widgets'),
      '@features': path.resolve(process.cwd(), 'src/features'),
      '@entities': path.resolve(process.cwd(), 'src/entities'),
      '@shared': path.resolve(process.cwd(), 'src/shared'),
    },
  },
});
