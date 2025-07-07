import eslint from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

export default ts.config(
    {
        ignores: ['**/{node_modules,dist,lib,docs,coverage}/**'],
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        extends: [eslint.configs.recommended],
    },
    {
        files: ['**/*.{ts,mts,cts}'],
        plugins: {
            '@typescript-eslint': ts.plugin,
        },
        languageOptions: {
            parser: ts.parser,
            parserOptions: {
                projectService: true,
            },
        },
    },
    {
        files: ['packages/*/{src}/**/*.ts'],
        name: 'src',
        ignores: [],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.worker,
                ...globals.serviceworker,
            },
        },
        extends: [ts.configs.strict],
        rules: {
            '@typescript-eslint/no-unsafe-function-type': 'off',
        },
    },
    {
        files: ['packages/*/{__tests__}/**/*.ts'],
        extends: [ts.configs.strict],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    {
        files: ['*.config.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        extends: [ts.configs.strict],
    }
);
