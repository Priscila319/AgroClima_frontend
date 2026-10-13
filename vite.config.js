import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT || 5173),
      strictPort: true,
      allowedHosts: ['localhost', '.localhost', '.e2b.app'],
      proxy: {
        '/api/java': {
          target: env.DEV_JAVA_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/java/, ''),
        },
        '/api/python': {
          target: env.DEV_PYTHON_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/python/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: ['localhost', '.localhost', '.e2b.app'],
    },
  };
});
