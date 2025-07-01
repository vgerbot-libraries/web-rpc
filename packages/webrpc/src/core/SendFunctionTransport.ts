import type { SerializableData } from '../protocol/SerializableData';
import type { Transport } from './Transport';

export class SendFunctionTransport implements Transport {
    constructor(readonly send: (data: SerializableData, transferables: Transferable[]) => void) {}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onMessage(_: (data: SerializableData) => void): () => void {
        return () => {
            //
        };
    }
    close(): void {
        //
    }
}
