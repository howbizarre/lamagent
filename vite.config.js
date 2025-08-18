import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // За Node.js приложения
  ssr: {
    noExternal: true
  },
  
  // Build конфигурация
  build: {
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/agent.ts'),
      name: 'LamaAgent',
      fileName: 'agent',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        'fs', 'path', 'readline', 'url', 'util', 'events', 'stream',
        // LlamaIndex packages
        'llamaindex',
        '@llamaindex/huggingface',
        '@llamaindex/ollama', 
        '@llamaindex/workflow',
        // Other dependencies
        'zod'
      ]
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // За по-четим код
    sourcemap: true
  },

  // Resolve конфигурация - автоматично resolve-ва .ts/.js файлове
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  // Development server
  server: {
    hmr: false // HMR не е нужен за Node.js apps
  },

  // Optimizations
  optimizeDeps: {
    exclude: ['llamaindex', '@llamaindex/huggingface', '@llamaindex/ollama', '@llamaindex/workflow']
  }
});
