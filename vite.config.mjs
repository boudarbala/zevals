import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
export default defineConfig(({ mode }) => ({
    test: {
        workspace: ['.'],
        globals: true,
        environment: 'node',
        env: Object.assign({}, loadEnv(mode, process.cwd(), '')),
    },
}));
//# sourceMappingURL=vite.config.mjs.map