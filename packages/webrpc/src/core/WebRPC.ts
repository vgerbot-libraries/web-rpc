import { isFunction } from '../common/isFunction';
import type { Method } from '../common/Method';
import type { PromisifyObject } from '../common/PromisifyType';
import { isRPCMessage } from '../protocol/Message';
import type { SerializableData } from '../protocol/SerializableData';
import { SendFunctionTransport } from './SendFunctionTransport';
import type { Transport } from './Transport';
import { WebRPCPort } from './WebRPCPort';

/**
 * WebRPC is a remote procedure call (RPC) system that enables seamless communication
 * between different execution contexts (e.g., web workers, iframes, main thread).
 *
 * It provides a simple interface to register services and call remote methods as if
 * they were local, handling serialization, transport, and promise-based responses
 * automatically.
 *
 * @example
 * ```typescript
 * // Create WebRPC instance with a transport function
 * const worker = new Worker('worker.js');
 * const webRPC = new WebRPC('client-1', new PostMessageTransport(worker));
 *
 * // Register a service
 * webRPC.register('math', {
 *   add: (a: number, b: number) => a + b,
 *   multiply: (a: number, b: number) => a * b
 * });
 *
 * // Get remote service proxy
 * const remoteMath = webRPC.get<{
 *   add: (a: number, b: number) => Promise<number>;
 *   multiply: (a: number, b: number) => Promise<number>;
 * }>('math');
 *
 * // Call remote methods
 * const result = await remoteMath.add(5, 3); // Returns 8
 * ```
 */
export class WebRPC {
    private readonly ports: Map<string, WebRPCPort> = new Map();
    private readonly transport: Transport;

    /**
     * Creates a new WebRPC instance.
     *
     * @param clientId - A unique identifier for this client instance
     * @param transport - Either a Transport object or a function that sends data to the remote endpoint
     */
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

    /**
     * Registers a service instance that can be called remotely.
     *
     * @param id - Unique identifier for the service
     * @param instance - Object containing methods to be exposed remotely
     *
     * @example
     * ```typescript
     * webRPC.register('calculator', {
     *   add: (a: number, b: number) => a + b,
     *   subtract: (a: number, b: number) => a - b
     * });
     * ```
     */
    register(id: string, instance: unknown) {
        const port = new WebRPCPort(this.clientId, id, instance as Record<string, Method>, this.transport);
        this.ports.set(id, port);
    }

    /**
     * Gets a proxy object for calling remote methods on a registered service.
     *
     * @param id - Identifier of the remote service
     * @returns A proxy object that allows calling remote methods as if they were local
     *
     * @example
     * ```typescript
     * const remoteCalc = webRPC.get<{
     *   add: (a: number, b: number) => Promise<number>;
     *   subtract: (a: number, b: number) => Promise<number>;
     * }>('calculator');
     *
     * const result = await remoteCalc.add(10, 5); // Returns 15
     * ```
     */
    get<T>(id: string): PromisifyObject<T> {
        if (!this.ports.has(id)) {
            const port = new WebRPCPort(this.clientId, id, {}, this.transport);
            this.ports.set(id, port);
        }
        const port = this.ports.get(id)!;
        return port.remoteImplementation as PromisifyObject<T>;
    }

    /**
     * Closes the WebRPC connection and cleans up resources.
     *
     * @example
     * ```typescript
     * webRPC.close();
     * ```
     */
    close() {
        this.transport.close();
    }
}
