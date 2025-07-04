import { isFunction } from '../common/isFunction';
import type { Method } from '../common/Method';
import type { PromisifyObject } from '../common/PromisifyType';
import { isRPCMessage } from '../protocol/Message';
import type { SerializableData } from '../protocol/SerializableData';
import { SendFunctionTransport } from './SendFunctionTransport';
import type { Transport } from './Transport';
import { WebRPCPort } from './WebRPCPort';

export class WebRPC {
    private readonly ports: Map<string, WebRPCPort> = new Map();
    private readonly transport: Transport;
    constructor(
        private readonly clientId: string,
        transport: Transport | ((data: SerializableData, transferables: Transferable[]) => void)
    ) {
        if (isFunction(transport)) {
            this.transport = new SendFunctionTransport(transport);
        } else {
            this.transport = transport;
        }
        this.transport.onMessage(data => {
            this.receive(data);
        });
    }

    receive(data: unknown) {
        if (!isRPCMessage(data)) {
            return;
        }
        if (data.invocationId.clientId !== this.clientId) {
            return;
        }
        const portId = data.invocationId.portId;
        const port = this.ports.get(portId);
        if (port) {
            port.receive(data);
        }
    }

    register(id: string, instance: unknown) {
        const port = new WebRPCPort(this.clientId, id, instance as Record<string, Method>, this.transport);
        this.ports.set(id, port);
    }

    get<T>(id: string): PromisifyObject<T> {
        if (!this.ports.has(id)) {
            const port = new WebRPCPort(this.clientId, id, {}, this.transport);
            this.ports.set(id, port);
        }
        const port = this.ports.get(id)!;
        return port.remoteImplementation as PromisifyObject<T>;
    }

    close() {
        this.transport.close();
    }
}
