import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 用相对路径：部署到 GitHub Pages 的子路径或任何静态托管都能直接用
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
