import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type BroadcastChannelTransportOptions = {
    channel: BroadcastChannel | string;
};

export class BroadcastChannelTransport implements Transport {
    private readonly channel: BroadcastChannel;
    private listener?: (event: MessageEvent) => void;

    constructor(options: BroadcastChannelTransportOptions) {
        if (typeof options.channel === 'string') {
            this.channel = new BroadcastChannel(options.channel);
        } else {
            this.channel = options.channel;
        }
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        if (transfer?.length) {
            console.warn('BroadcastChannelTransport does not support transferable objects.');
        }
        this.channel.postMessage(data);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            callback(event.data);
        };

        this.channel.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                this.channel.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.channel.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
        this.channel.close();
    }
}
