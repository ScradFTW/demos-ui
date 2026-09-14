import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.js (which sets the production `base: '/ai/'`
// used only for the real build) so test config never touches the deploy
// build config.
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.js']
    }
});
