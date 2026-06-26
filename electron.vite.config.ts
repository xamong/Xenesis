import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const bundledMainDeps = ['@xcon-viewer/core', '@xcon-viewer/viewer'];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: bundledMainDeps })],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve(projectRoot, 'src/renderer'),
    plugins: [react()],
    server: {
      proxy: {
        '/xamong-api': {
          target: 'https://www.xamong.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/xamong-api/, ''),
        },
      },
    },
    build: {
      minify: false,
      rollupOptions: {
        input: {
          index: resolve(projectRoot, 'src/renderer/index.html'),
        },
      },
    },
  },
});
