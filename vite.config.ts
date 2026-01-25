import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        chunkSizeWarningLimit: 650,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (id.includes('lightweight-charts')) {
                        return 'charts';
                    }
                    if (id.includes('jspdf') || id.includes('html2canvas')) {
                        return 'reporting';
                    }
                    if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
                        return 'markdown';
                    }
                    if (id.includes('framer-motion')) {
                        return 'motion';
                    }
                    if (id.includes('lucide-react')) {
                        return 'icons';
                    }
                    if (id.includes('firebase')) {
                        return 'firebase';
                    }
                    return;
                },
            },
        },
    },
})
