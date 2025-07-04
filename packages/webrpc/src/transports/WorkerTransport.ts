import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type WorkerTransportOptions = {
    target: Worker;
};

/**
 * WorkerTransport provides a Transport implementation for communication with Web Workers.
 *
 * This transport enables bidirectional communication between the main thread and worker threads,
 * supporting both regular data transfer and transferable objects for efficient handling of
 * large data structures like ArrayBuffers.
 *
 * @example
 * ```typescript
 * // Main thread - Create WebRPC with WorkerTransport
 * const worker = new Worker('./worker.js');
 * const transport = new WorkerTransport({ target: worker });
 * const webRPC = new WebRPC('main-thread', transport);
 *
 * // Register a service in main thread
 * webRPC.register('fileSystem', {
 *   readFile: async (path: string) => {
 *     // File reading logic
 *     return new ArrayBuffer(1024);
 *   }
 * });
 *
 * // Get remote service from worker
 * const workerMath = webRPC.get<{
 *   calculate: (data: number[]) => Promise<number>;
 * }>('mathService');
 *
 * const result = await workerMath.calculate([1, 2, 3, 4, 5]);
 * ```
 *
 * @example
 * ```typescript
 * // Worker thread (worker.js) - Create WebRPC with WorkerTransport
 * const transport = new WorkerTransport({ target: self as any });
 * const webRPC = new WebRPC('worker-thread', transport);
 *
 * // Register a service in worker thread
 * webRPC.register('mathService', {
 *   calculate: (numbers: number[]) => {
 *     return numbers.reduce((sum, num) => sum + num, 0);
 *   }
 * });
 *
 * // Get remote service from main thread
 * const mainFileSystem = webRPC.get<{
 *   readFile: (path: string) => Promise<ArrayBuffer>;
 * }>('fileSystem');
 *
 * const fileData = await mainFileSystem.readFile('/path/to/file.bin');
 * ```
 *
 */
export class WorkerTransport implements Transport {
    private readonly target: Worker | DedicatedWorkerGlobalScope;
    private listener?: (event: MessageEvent) => void;

    constructor(options: WorkerTransportOptions) {
        this.target = options.target;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        this.target.postMessage(data, transfer ?? []);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            callback(event.data);
        };

        const target = this.target as unknown as EventSource;

        target.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                target.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            (this.target as unknown as EventSource).removeEventListener('message', this.listener);
            this.listener = undefined;
        }
    }
}
