import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    rollupOptions: {
      input: {
        hub: './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@lillskolan/lesson-sdk': path.resolve(__dirname, '../../packages/lesson-sdk/src/index.ts')
    }
  }
});
