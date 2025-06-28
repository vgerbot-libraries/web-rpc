import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        conditions: ['@monorepo/source'],
    },
    test: {
        environment: 'node',
        globals: true,
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'dist/',
                'lib/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**',
                '**/__tests__/**',
                '**/*.spec.*',
                '**/*.test.*',
            ],
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
            },
        },
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['**/unit/**/*.spec.ts'],
                    globals: true,
                },
            },
            {
                test: {
                    name: 'integration',
                    include: ['**/integration/**/*.spec.ts'],
                    globals: true,
                },
            },
        ],
    },
});
