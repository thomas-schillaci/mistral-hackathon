import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
        ...(command === 'build' && {
            minify: 'terser',
            terserOptions: {
                compress: { passes: 2 },
                mangle: true,
                format: { comments: false }
            }
        })
    },
    server: {
        port: 8080
    }
}));
