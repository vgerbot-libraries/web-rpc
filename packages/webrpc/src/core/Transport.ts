import type { SerializableData } from '../protocol/SerializableData';

/**
 * Transport interface defines the contract for communication channels in the WebRPC system.
 *
 * It provides an abstraction layer that allows WebRPC to work with different communication
 * mechanisms such as web workers, iframes, WebSockets, or any other bidirectional
 * communication channel.
 *
 * @example
 * ```typescript
 * // Example implementation for Web Worker
 * class WebWorkerTransport implements Transport {
 *   constructor(private worker: Worker) {}
 *
 *   send(data: SerializableData, transfer?: Transferable[]) {
 *     this.worker.postMessage(data, transfer);
 *   }
 *
 *   onMessage(callback: (data: SerializableData) => void) {
 *     const handler = (event: MessageEvent) => callback(event.data);
 *     this.worker.addEventListener('message', handler);
 *     return () => this.worker.removeEventListener('message', handler);
 *   }
 *
 *   close() {
 *     this.worker.terminate();
 *   }
 * }
 * ```
 */
export interface Transport {
    /**
     * Sends data through the transport channel.
     *
     * @param data - The serializable data to send
     * @param transfer - Optional array of transferable objects (e.g., ArrayBuffers, MessagePorts)
     *
     * @example
     * ```typescript
     * transport.send({ type: 'rpc-call', method: 'getData' });
     *
     * // With transferables
     * const buffer = new ArrayBuffer(1024);
     * transport.send({ type: 'rpc-call', data: buffer }, [buffer]);
     * ```
     */
    send(data: SerializableData, transfer?: Transferable[]): void;

    /**
     * Registers a callback function to handle incoming messages.
     *
     * @param callback - Function to call when a message is received
     * @returns A cleanup function that removes the message listener when called
     *
     * @example
     * ```typescript
     * const unsubscribe = transport.onMessage((data) => {
     *   console.log('Received:', data);
     * });
     *
     * // Later, remove the listener
     * unsubscribe();
     * ```
     */
    onMessage(callback: (data: SerializableData) => void): () => void;

    /**
     * Closes the transport connection and cleans up resources.
     *
     * This method should be called when the transport is no longer needed
     * to prevent memory leaks and free up resources.
     *
     * @example
     * ```typescript
     * transport.close();
     * ```
     */
    close(): void;
}
