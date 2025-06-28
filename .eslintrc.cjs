module.exports = {
    parser: '@typescript-eslint/parser',
    overrides: [
        {
            files: ['*.ts', '*.tsx'],

            extends: [
                //  Use the recommended rules from the @typescript-eslint/eslint-plugin
                'plugin:@typescript-eslint/recommended',
            ],
            parserOptions: {
                project: [__dirname + '/tsconfig.source.json', __dirname + '/tsconfig.test.json'],
            },
            rules: {
                '@typescript-eslint/no-inferrable-types': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/no-var-requires': 'off',
            },
        },
        {
            files: ['*.mjs', '*.js', '*.jsx', '*.es', '*.cjs'],
        },
        {
            files: ['*.ts'],
            extends: [],

            parserOptions: {
                project: [__dirname + '/tsconfig.devtools.json'],
            },
        },
    ],
    plugins: ['@typescript-eslint', 'prettier'],

    rules: {
        'prettier/prettier': 'error',
        'no-console': 'off',
        'no-bitwise': 'off',
        quotes: 'off',
        'max-len': ['error', 120],
        'arrow-parens': 'off',
        indent: ['error', 4, { SwitchCase: 1 }],
    },
    ignorePatterns: ['node_modules', 'dist', 'lib', 'docs', '.github', '.husky', 'coverage'],
};
