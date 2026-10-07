import { defineConfig } from 'vite';

// Serve SPA routes (including /invite) without the development BFF proxy.
// Playwright owns every API fixture; no backend should be reachable here.
export default defineConfig({ preview: { proxy: {} } });
