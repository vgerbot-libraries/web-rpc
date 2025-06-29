/// <reference types="chrome" />

import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type BrowserExtensionTransportOptions = {
    port: chrome.runtime.Port;
};

export class BrowserExtensionTransport implements Transport {
    private readonly port: chrome.runtime.Port;
    private listener?: (message: object, port: chrome.runtime.Port) => void;

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
