import { isPlainObject } from '../common/isPlainObject';
import type { ErrorInfo } from './ErrorInfo';
import type { InvocationId } from './InvocationId';
import type { SerializableData } from './SerializableData';

export interface RPCMessage {
    id: InvocationId;
    _webrpc: {
        action: 'method-call' | 'method-return';
        timestamp: number;
    };
}

export interface CallMethodMessage extends RPCMessage {
    _webrpc: {
        action: 'method-call';
        timestamp: number;
    };
    method: string;
    params: SerializableData[];
}

export interface ReturnMethodMessage extends RPCMessage {
    _webrpc: {
        action: 'method-return';
        timestamp: number;
    };
    result?: SerializableData;
    error?: ErrorInfo;
}

export function isRPCMessage(data: unknown): data is RPCMessage {
    return (
        isPlainObject(data) &&
        typeof data.id === 'string' &&
        isPlainObject(data._webrpc) &&
        typeof data._webrpc.action === 'string' &&
        typeof data._webrpc.timestamp === 'number' &&
        (data._webrpc.action === 'method-call' || data._webrpc.action === 'method-return')
    );
}
