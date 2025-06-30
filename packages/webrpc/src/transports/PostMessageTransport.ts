import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

type PostMessageTarget = {
    postMessage: (message: unknown, transfer?: Transferable[]) => void;
    addEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
    removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
};

export class PostMessageTransport implements Transport {
    private listener?: (event: MessageEvent) => void;
    constructor(private readonly target: PostMessageTarget) {
        //
    }
    send(data: SerializableData, transfer?: Transferable[]): void {
        this.target.postMessage(data, transfer);
    }
    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            callback(event.data);
        };

        this.target.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                this.target.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }
    close(): void {
        if (this.listener) {
            this.target.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
    }
}
