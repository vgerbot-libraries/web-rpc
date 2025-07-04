import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

type MessageSender = MessagePort | BroadcastChannel | ServiceWorker | DedicatedWorkerGlobalScope;

/**
 * PostMessageTransport provides a generic Transport implementation for various message-based communication channels.
 *
 * This transport supports multiple types of message senders, making it versatile for different communication
 * scenarios including MessageChannel, BroadcastChannel, ServiceWorker, and DedicatedWorkerGlobalScope.
 * It automatically handles the differences between these communication mechanisms.
 *
 * @template T - The type of message sender (MessagePort, BroadcastChannel, ServiceWorker, or
 * DedicatedWorkerGlobalScope)
 *
 * @example
 * ```typescript
 * // MessagePort example (for MessageChannel communication)
 * const channel = new MessageChannel();
 * const transport = new PostMessageTransport(channel.port1);
 * const webRPC = new WebRPC('client-1', transport);
 *
 * // Send port2 to another context
 * otherContext.postMessage({ port: channel.port2 }, [channel.port2]);
 * ```
 *
 * @example
 * ```typescript
 * // BroadcastChannel example (for cross-tab communication)
 * const broadcastChannel = new BroadcastChannel('my-app-channel');
 * const transport = new PostMessageTransport(broadcastChannel);
 * const webRPC = new WebRPC('tab-1', transport);
 *
 * // Register a service that can be accessed from other tabs
 * webRPC.register('storage', {
 *   setItem: (key: string, value: string) => localStorage.setItem(key, value),
 *   getItem: (key: string) => localStorage.getItem(key)
 * });
 * ```
 *
 * @example
 * ```typescript
 * // ServiceWorker example (for main thread to service worker communication)
 * const registration = await navigator.serviceWorker.register('./sw.js');
 * const serviceWorker = registration.active;
 * if (serviceWorker) {
 *   const transport = new PostMessageTransport(serviceWorker);
 *   const webRPC = new WebRPC('main-thread', transport);
 *
 *   const swAPI = webRPC.get<{
 *     cacheResource: (url: string) => Promise<void>;
 *     getCachedData: (key: string) => Promise<any>;
 *   }>('cacheService');
 *
 *   await swAPI.cacheResource('/api/data');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // DedicatedWorkerGlobalScope example (inside a worker)
 * // worker.js
 * const transport = new PostMessageTransport(self);
 * const webRPC = new WebRPC('worker', transport);
 *
 * webRPC.register('computation', {
 *   heavyCalculation: (data: number[]) => {
 *     return data.reduce((sum, num) => sum + num * num, 0);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Transferable objects example (works with MessagePort, ServiceWorker, and DedicatedWorkerGlobalScope)
 * const channel = new MessageChannel();
 * const transport = new PostMessageTransport(channel.port1);
 *
 * const buffer = new ArrayBuffer(1024);
 * transport.send({ type: 'process-buffer', buffer }, [buffer]);
 * // Note: BroadcastChannel does not support transferable objects
 * ```
 */
export class PostMessageTransport<T extends MessageSender> implements Transport {
    private readonly cleanup: Array<() => void> = [];
    constructor(private readonly sender: T) {
        if (!isPostMessageTarget(sender)) {
            throw new Error(`Invalid post message target: ${typeof sender} is not a valid post message target`);
        }
        if (isMessagePort(this.sender)) {
            this.sender.start();
        }
    }
    send(data: SerializableData, transfer?: Transferable[]): void {
        const sender = this.sender;
        if (isBroadcastChannel(sender)) {
            sender.postMessage(data);
        } else {
            sender.postMessage(data, transfer ?? []);
        }
    }
    onMessage(callback: (data: SerializableData) => void): () => void {
        const target = this.sender;
        const listener = (event: Event) => {
            if (event instanceof MessageEvent) {
                callback(event.data);
            }
        };
        target.addEventListener('message', listener);
        this.cleanup.push(() => {
            target.removeEventListener('message', listener);
        });
        return () => {
            target.removeEventListener('message', listener);
        };
    }
    close(): void {
        this.cleanup.forEach(cleanup => cleanup());
        this.cleanup.length = 0;
    }
}
function isMessagePort(target: MessageSender): target is MessagePort {
    return target instanceof MessagePort;
}

function isBroadcastChannel(target: MessageSender): target is BroadcastChannel {
    return target instanceof BroadcastChannel;
}

function isServiceWorker(target: MessageSender): target is ServiceWorker {
    return target instanceof ServiceWorker;
}

function isDedicatedWorkerGlobalScope(target: MessageSender): target is DedicatedWorkerGlobalScope {
    if (typeof DedicatedWorkerGlobalScope === 'undefined') {
        return false;
    }
    return target instanceof DedicatedWorkerGlobalScope;
}

function isPostMessageTarget(target: MessageSender): target is MessageSender {
    return (
        isMessagePort(target) ||
        isBroadcastChannel(target) ||
        isServiceWorker(target) ||
        isDedicatedWorkerGlobalScope(target)
    );
}
