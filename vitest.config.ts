import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/**/*.{test,spec}.ts'],
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    environment: 'node',
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    reporters: 'default',
  },
});
