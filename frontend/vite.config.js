import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const customLogger = createLogger();
const originalLoggerError = customLogger.error.bind(customLogger);

// Suppress transient WebSocket proxy error stack traces during socket aborts, reconnects, or backend restarts
customLogger.error = (msg, options) => {
  if (
    typeof msg === 'string' &&
    (msg.includes('ws proxy error') || msg.includes('ws proxy socket error') || msg.includes('http proxy error')) &&
    (msg.includes('ECONNABORTED') || msg.includes('ECONNRESET') || msg.includes('ECONNREFUSED') || msg.includes('EPIPE'))
  ) {
    return;
  }
  originalLoggerError(msg, options);
};

// https://vite.dev/config/
export default defineConfig({
  customLogger,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        ws: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently suppress socket abort, reset, or restart noise
            if (['ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED', 'EPIPE'].includes(err.code)) return;
            console.error('[vite] ws proxy error:', err.message);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              if (['ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED', 'EPIPE'].includes(err.code)) return;
              console.error('[vite] ws socket error:', err.message);
            });
          });
        },
      },
      '/swagger-ui': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
      '/v3/api-docs': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-router-dom') || id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
  // Vitest configuration for unit and component testing
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
});

