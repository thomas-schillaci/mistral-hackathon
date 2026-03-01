import {defineConfig} from 'vite';
import {implementPlugin} from './vite-plugin-implement.mjs';

export default defineConfig(({command}) => ({
    plugins: [implementPlugin()],
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
                compress: {passes: 2},
                mangle: true,
                format: {comments: false}
            }
        })
    },
    server: {
        port: 8080
    }
}));
