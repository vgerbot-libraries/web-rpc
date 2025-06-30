import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type WindowPostMessageOptions = {
    remote: Window;
    origin?: string;
    source?: Window;
};

export class WindowPostMessageTransport implements Transport {
    private readonly remote: Window;
    private readonly origin: string;
    private readonly source: Window;
    private listener?: (event: MessageEvent) => void;

    constructor(options: WindowPostMessageOptions) {
        this.remote = options.remote;
        this.origin = options.origin ?? '*';
        this.source = options.source ?? window;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        this.remote.postMessage(data, this.origin, transfer);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            if (this.origin !== '*' && event.origin !== this.origin) {
                return;
            }
            if (event.source !== this.remote) {
                return;
            }
            callback(event.data);
        };

        this.source.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                this.source.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.source.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
    }
}
