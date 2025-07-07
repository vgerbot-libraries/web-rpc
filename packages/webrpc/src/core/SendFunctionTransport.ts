import type { SerializableData } from '../protocol/SerializableData';
import type { Transport } from './Transport';

export class SendFunctionTransport implements Transport {
    constructor(readonly send: (data: SerializableData, transferables: Transferable[]) => void) {}

    onMessage(_: (data: SerializableData) => void): () => void {
        return () => {
            //
        };
    }
    close(): void {
        //
    }
}
