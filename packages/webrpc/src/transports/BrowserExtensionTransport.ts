import type browser from 'webextension-polyfill';

import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type BrowserExtensionTransportOptions = {
    port: browser.Runtime.Port;
};

export class BrowserExtensionTransport implements Transport {
    private readonly port: browser.Runtime.Port;
    private listener?: (message: unknown, port: browser.Runtime.Port) => void;

    constructor(options: BrowserExtensionTransportOptions) {
        this.port = options.port;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        if (transfer?.length) {
            console.warn('BrowserExtensionTransport does not support transferable objects.');
        }
        this.port.postMessage(data);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = message => {
            callback(message as SerializableData);
        };

        this.port.onMessage.addListener(this.listener);

        return () => {
            if (this.listener) {
                this.port.onMessage.removeListener(this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.port.onMessage.removeListener(this.listener);
            this.listener = undefined;
        }
        this.port.disconnect();
    }
}
