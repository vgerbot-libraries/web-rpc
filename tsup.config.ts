import { defineConfig } from 'tsup';

export default defineConfig({
    sourcemap: true,
    dts: true,
    minify: false,

    tsconfig: './tsconfig.source.json',

    format: ['cjs', 'esm'],
    outDir: 'lib',
});
