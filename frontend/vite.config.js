import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/upload': {
                target: 'http://localhost:8080',
                changeOrigin: true
            },
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
            },
            '/ws': { target: 'ws://localhost:8080', ws: true }
        }
    }
});