import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In dev the SPA runs on :5173 and proxies API calls to the Express server on
// :5001. In production the Express server serves the built files in dist/, so
// the same relative /api paths work without any config.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://localhost:5001',
        },
    },
    build: {
        outDir: 'dist',
    },
});
