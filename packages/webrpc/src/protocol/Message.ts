import { isPlainObject } from '../common/isPlainObject';
import type { ErrorInfo } from './ErrorInfo';
import type { InvocationId } from './InvocationId';
import type { SerializableData } from './SerializableData';

export interface RPCMessage {
    invocationId: InvocationId;
    action: 'method-call' | 'method-return';
    timestamp: number;
}
export interface CallMethodMessage extends RPCMessage {
    action: 'method-call';
    method: string;
    args: SerializableData[];
}
export interface ReturnMethodMessage extends RPCMessage {
    action: 'method-return';
    status: 'success' | 'error';
    result?: SerializableData;
    error?: ErrorInfo;
}
export function isRPCMessage(data: unknown): data is RPCMessage {
    return (
        isPlainObject(data) &&
        typeof data.invocationId === 'object' &&
        typeof data.action === 'string' &&
        typeof data.timestamp === 'number' &&
        (data.action === 'method-call' || data.action === 'method-return')
    );
}

export function isCallMethodMessage(data: unknown): data is CallMethodMessage {
    return isRPCMessage(data) && data.action === 'method-call';
}

export function isReturnMethodMessage(data: unknown): data is ReturnMethodMessage {
    return isRPCMessage(data) && data.action === 'method-return';
}
