import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
    host: true
  },
  base: process.env.NODE_ENV === 'production' ? '/lesson/' : '/',
  build: {
    rollupOptions: {
      input: {
        'phonics-cvc': './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@lillskolan/lesson-sdk': path.resolve(__dirname, '../../../packages/lesson-sdk/src/index.ts')
    }
  }
});
