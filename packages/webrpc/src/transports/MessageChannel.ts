import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type MessageChannelTransportOptions = {
    port: MessagePort;
};

export class MessageChannelTransport implements Transport {
    private readonly port: MessagePort;
    private listener?: (event: MessageEvent) => void;

    constructor(options: MessageChannelTransportOptions) {
        this.port = options.port;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        this.port.postMessage(data, transfer ?? []);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            callback(event.data);
        };

        this.port.addEventListener('message', this.listener);
        this.port.start();

        return () => {
            if (this.listener) {
                this.port.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.port.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
        this.port.close();
    }
}
