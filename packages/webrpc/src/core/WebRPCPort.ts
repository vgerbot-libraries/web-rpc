import { Defer } from '../common/Defer';
import { deserializeRequestData } from '../common/deserializeRequestData';
import { serializeRequestData } from '../common/serializeRequestData';
import { isFunction } from '../common/isFunction';
import { isPromiseLike } from '../common/isPromiseLike';
import type { Method } from '../common/Method';
import uid from '../common/uid';
import type { InvocationId, SafeId } from '../protocol/InvocationId';
import { createSafeId, createInvocationId, parseInvocationId } from '../protocol/InvocationId';
import type { CallMethodMessage, CleanupCallbackMessage, RPCMessage, ReturnMethodMessage } from '../protocol/Message';
import type { SerializableData } from '../protocol/SerializableData';
import type { Transport } from './Transport';

export class WebRPCPort {
    private readonly callbacks: Map<string, Method> = new Map();
    private readonly invocationDefers: Map<string, Defer<unknown>> = new Map();
    private readonly clientId: SafeId;
    private readonly portId: SafeId;

    public readonly remoteImplementation = new Proxy(
        {},
        {
            has(property) {
                switch (property) {
                    case 'then':
                        return false;
                }
                return typeof property === 'string';
            },
            get: (target, property) => {
                if (typeof property === 'symbol') {
                    return undefined;
                }
                if (property === 'then') {
                    return undefined;
                }
                return (...args: unknown[]) => {
                    return this.invokeRemoteMethod(property, args);
                };
            },
        }
    );

    constructor(
        clientId: string,
        portId: string,
        private readonly localInstance: Record<string, Method>,
        private readonly transport: Transport
    ) {
        // Validate that clientId and portId don't contain forward slashes
        this.clientId = createSafeId(clientId);
        this.portId = createSafeId(portId);
    }

    receive(message: RPCMessage) {
        switch (message._webrpc.action) {
            case 'method-call':
                this.handleMethodCall(message as CallMethodMessage);
                break;
            case 'method-return':
                this.handleMethodReturn(message as ReturnMethodMessage);
                break;
            case 'cleanup-callback':
                this.cleanupLocalCallback(message as CleanupCallbackMessage);
                break;
        }
    }
    private cleanupLocalCallback(message: CleanupCallbackMessage) {
        this.callbacks.delete(createSafeId(message.callbackId));
    }
    private cleanupRemoteCallback(callbackId: string) {
        this.transport.send({
            id: callbackId,
            _webrpc: {
                action: 'cleanup-callback',
                timestamp: Date.now(),
            },
        });
    }

    private async invokeRemoteMethod(methodName: string, args: unknown[]): Promise<unknown> {
        const actionId = uid('invocation-********');
        const { data, transferables, functions } = serializeRequestData(this.portId, args);
        const defer = new Defer<unknown>();

        functions.forEach((func, functionId) => {
            this.callbacks.set(functionId, func as Method);
        });

        const req: CallMethodMessage = {
            id: createInvocationId(this.clientId, this.portId, actionId),
            _webrpc: {
                action: 'method-call',
                timestamp: Date.now(),
            },
            method: methodName,
            params: data as SerializableData[],
        };
        this.transport.send(req as unknown as SerializableData, Array.from(transferables));

        this.invocationDefers.set(actionId, defer);

        return defer.promise;
    }

    private handleMethodCall(message: CallMethodMessage) {
        const args = deserializeRequestData(
            message.params,
            (callbackId, args) => {
                return this.invokeRemoteMethod(callbackId, args);
            },
            id => {
                this.cleanupRemoteCallback(id);
            }
        );
        let method: Method | undefined;
        if (Object.prototype.hasOwnProperty.call(this.localInstance, message.method)) {
            method = (this.localInstance[message.method] as Method).bind(this.localInstance);
        } else {
            method = this.callbacks.get(message.method);
        }
        if (!isFunction(method)) {
            throw new Error(`Method not found: ${message.method}`);
        }
        this.invokeLocalMethod(message.id, method, args);
    }

    private invokeLocalMethod(invocationId: InvocationId, method: Method, args: unknown[]) {
        const handleSuccess = (result: unknown) => {
            const { data, transferables, functions } = serializeRequestData(this.portId, [result]);
            functions.forEach((func, functionId) => {
                this.callbacks.set(functionId, func);
            });
            const response: ReturnMethodMessage = {
                id: invocationId,
                _webrpc: {
                    action: 'method-return',
                    timestamp: Date.now(),
                },
                result: data[0] as SerializableData,
            };
            this.transport.send(response as unknown as SerializableData, Array.from(transferables));
        };
        const handleError = (reason: unknown) => {
            const ret: ReturnMethodMessage = {
                id: invocationId,
                _webrpc: {
                    action: 'method-return',
                    timestamp: Date.now(),
                },
                error: {
                    code: -32603, // Internal error
                    message: reason instanceof Error ? reason.message : String(reason),
                    stack: reason instanceof Error ? reason.stack : undefined,
                },
            };
            this.transport.send(ret as unknown as SerializableData, []);
        };
        try {
            const result = method(...args);
            if (isPromiseLike(result)) {
                result.then(handleSuccess, handleError);
            } else {
                handleSuccess(result);
            }
        } catch (e) {
            handleError(e);
        }
    }

    private handleMethodReturn(message: ReturnMethodMessage) {
        const { id: actionId } = parseInvocationId(message.id);
        const defer = this.invocationDefers.get(actionId);
        if (defer) {
            if ('result' in message) {
                const result = deserializeRequestData(
                    [message.result],
                    (callbackId, callbackArgs) => {
                        return this.invokeRemoteMethod(callbackId, callbackArgs);
                    },
                    id => {
                        this.cleanupRemoteCallback(id);
                    }
                )[0];
                defer.resolve(result);
            } else if ('error' in message) {
                defer.reject(message.error);
            }
        }
        this.invocationDefers.delete(actionId);
    }
}
