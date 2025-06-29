import { defineConfig } from 'tsup';

export default defineConfig({
    sourcemap: true,
    dts: true,
    minify: false,

    format: ['cjs', 'esm'],
    outDir: 'lib',
});
