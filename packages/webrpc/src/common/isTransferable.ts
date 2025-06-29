export function isTransferable(value: unknown): value is Transferable {
    return (
        value instanceof ArrayBuffer ||
        value instanceof MessagePort ||
        (globalThis.OffscreenCanvas && value instanceof globalThis.OffscreenCanvas) ||
        (globalThis.ReadableStream && value instanceof globalThis.ReadableStream) ||
        (globalThis.WritableStream && value instanceof globalThis.WritableStream) ||
        (globalThis.TransformStream && value instanceof globalThis.TransformStream) ||
        (globalThis.VideoFrame && value instanceof globalThis.VideoFrame) ||
        (globalThis.ImageBitmap && value instanceof globalThis.ImageBitmap)
    );
}
