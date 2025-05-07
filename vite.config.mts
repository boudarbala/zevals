import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    workspace: ['.'],
    globals: true,
    environment: 'node',
    env: {
      ...loadEnv(mode, process.cwd(), ''), // Loads all .env variables
    },
  },
}));
