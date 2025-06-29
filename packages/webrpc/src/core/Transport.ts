import type { SerializableData } from '../protocol/SerializableData';

export interface Transport {
    send(data: SerializableData, transfer?: Transferable[]): void;
    onMessage(callback: (data: SerializableData) => void): () => void;
    close(): void;
}
