import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/apiAgent': {
          target: env.VITE_API_AGENT_TARGET || 'http://8.130.154.76:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/apiAgent/, ''),
        },
        '/authApi': {
          target: 'http://192.168.8.201:21007',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/authApi/, ''),
        },
      },
    },
  }
})
