import { defineConfig } from 'tsup';

export default defineConfig({
    sourcemap: true,
    dts: true,
    minify: false,

    format: ['cjs', 'esm', 'iife'],
    outDir: 'lib',
    globalName: 'WebRPCLib',
    footer: ctx => {
        if (ctx.format === 'iife') {
            return {
                js: 'globalThis.WebRPC = WebRPCLib.WebRPC;',
            };
        } else {
            return {};
        }
    },
});
