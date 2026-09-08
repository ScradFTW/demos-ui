import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// This same build gets deployed to five different nginx alias paths
// (/llm-testing/, /genre-classifier/, /agent-demo/, /image-classifier/,
// /status/) so it can keep answering all five existing homepage links
// while actually being one consolidated app. A relative base means the
// asset URLs resolve correctly no matter which of those it's served from.
export default defineConfig({
    base: './',
    plugins: [react(), tailwindcss()]
});
