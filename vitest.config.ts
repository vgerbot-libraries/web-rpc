import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        conditions: ['@vgerbot/source'],
    },
    test: {
        globals: true,
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        coverage: {
            enabled: true,
            provider: 'istanbul',
            reporter: ['text', 'html', 'cobertura'],
            reportsDirectory: './coverage',
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/lib/**',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**',
                '**/__tests__/**',
                '**/*.spec.*',
                '**/*.test.*',
                '**/docs/**',
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
                    environment: 'node',
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
                    browser: {
                        enabled: true,
                        provider: 'playwright',
                        instances: [
                            {
                                browser: 'chromium',
                            },
                        ],
                    },
                },
            },
        ],
    },
});
