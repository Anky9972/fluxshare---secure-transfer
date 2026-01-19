import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    envPrefix: ['VITE_'],
    
    // Build optimizations for faster loading
    build: {
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      // Code splitting configuration
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'recharts'],
            'crypto-vendor': ['crypto-js', 'fflate', 'pako'],
            'media-vendor': ['wavesurfer.js', 'qrcode.react'],
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            'markdown-vendor': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
          },
        },
      },
      // Increase chunk size warning limit (optional)
      chunkSizeWarningLimit: 1000,
      // Generate source maps for debugging (disable in production for smaller builds)
      sourcemap: mode !== 'production',
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        '@google/generative-ai',
      ],
      // Exclude heavy libs that are loaded conditionally
      exclude: [],
    },
    
    // Enable CSS code splitting
    css: {
      devSourcemap: true,
    },
  };
});
