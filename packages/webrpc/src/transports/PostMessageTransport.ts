import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

type MessageSender = MessagePort | BroadcastChannel | ServiceWorker | DedicatedWorkerGlobalScope;

export class PostMessageTransport<T extends MessageSender> implements Transport {
    private readonly cleanup: Array<() => void> = [];
    constructor(private readonly sender: T) {
        if (!isPostMessageTarget(sender)) {
            throw new Error(`Invalid post message target: ${typeof sender} is not a valid post message target`);
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
