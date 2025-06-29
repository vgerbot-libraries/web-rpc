import type { TypedArray } from './TypedArray';

export function isTypedArray(value: unknown): value is TypedArray {
    return (
        value instanceof Uint8Array ||
        value instanceof Uint16Array ||
        value instanceof Uint32Array ||
        value instanceof Int8Array ||
        value instanceof Int16Array ||
        value instanceof Int32Array ||
        value instanceof Uint8ClampedArray
    );
}
