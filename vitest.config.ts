import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/browser/**', 'node_modules/**', '.next/**', 'out/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.next/', 'out/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@state': path.resolve(__dirname, './src/state'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@webmcp': path.resolve(__dirname, './src/webmcp'),
    },
  },
});
