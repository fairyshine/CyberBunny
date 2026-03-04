import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  // GitHub Pages 部署配置 - 根据仓库名自动调整
  base: process.env.GITHUB_PAGES ? '/CyberBunny/' : '/',
  server: {
    // 配置代理以解决 CORS 问题
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        configure: (proxy, options) => {
          // 动态代理配置 - 支持自定义目标
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const target = url.searchParams.get('target');

            if (target) {
              // 使用自定义目标
              const targetUrl = new URL(decodeURIComponent(target));
              console.log(`[Proxy] Forwarding to custom target: ${targetUrl.origin}`);

              // 修改请求头
              proxyReq.setHeader('host', targetUrl.host);
              proxyReq.path = targetUrl.pathname + targetUrl.search;
              options.target = targetUrl.origin;
            } else {
              console.log(`[Proxy] Forwarding to default: ${options.target}`);
            }
          });
        }
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'vendor-ui': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
})
