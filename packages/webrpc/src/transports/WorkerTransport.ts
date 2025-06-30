import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type WorkerTransportOptions = {
    worker: Worker;
};

export class WorkerTransport implements Transport {
    private readonly worker: Worker;
    private listener?: (event: MessageEvent) => void;

    constructor(options: WorkerTransportOptions) {
        this.worker = options.worker;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        this.worker.postMessage(data, transfer ?? []);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            callback(event.data);
        };

        this.worker.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                this.worker.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.worker.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
    }
}
