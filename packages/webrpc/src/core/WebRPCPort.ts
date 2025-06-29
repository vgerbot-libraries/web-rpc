import { Defer } from '../common/Defer';
import { deserializeRequestData } from '../common/deserializeRequestData';
import { serializeRequestData } from '../common/serializeRequestData';
import { isFunction } from '../common/isFunction';
import { isPromiseLike } from '../common/isPromiseLike';
import type { Method } from '../common/Method';
import uid from '../common/uid';
import type { InvocationId } from '../protocol/InvocationId';
import type { CallMethodMessage, RPCMessage, ReturnMethodMessage } from '../protocol/Message';
import type { SerializableData } from '../protocol/SerializableData';
import type { Transport } from './Transport';

export class WebRPCPort {
    private readonly callbacks: Map<string, Method> = new Map();
    private readonly invocationDefers: Map<string, Defer<unknown>> = new Map();

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
        private readonly clientId: string,
        private readonly portId: string,
        private readonly instance: Record<string, Method>,
        private readonly transport: Transport
    ) {
        //
    }

    receive(req: RPCMessage) {
        switch (req.action) {
            case 'method-call':
                this.handleMethodCall(req as CallMethodMessage);
                break;
            case 'method-return':
                this.handleMethodReturn(req as ReturnMethodMessage);
                break;
        }
    }
    private async invokeRemoteMethod(method: string, args: unknown[]): Promise<unknown> {
        const invocationId = uid('invocation-********');
        const { data, transferables, functions } = serializeRequestData(this.portId, args);
        const defer = new Defer<unknown>();

        functions.forEach((func, id) => {
            this.callbacks.set(id, func as Method);
        });

        const req: CallMethodMessage = {
            invocationId: {
                clientId: this.clientId,
                portId: this.portId,
                method,
                invocationId,
            },
            action: 'method-call',
            method,
            args: data as SerializableData[],
            timestamp: Date.now(),
        };
        this.transport.send(req as unknown as SerializableData, Array.from(transferables));

        this.invocationDefers.set(invocationId, defer);

        return defer.promise;
    }

    private handleMethodCall(req: CallMethodMessage) {
        const invocationId = req.invocationId;
        const args = deserializeRequestData(req.args, (callbackId, args) => {
            return this.invokeRemoteMethod(callbackId, args);
        });
        let method: Method | undefined;
        if (Object.prototype.hasOwnProperty.call(this.instance, req.method)) {
            method = (this.instance[req.method] as Method).bind(this.instance);
        } else {
            method = this.callbacks.get(req.method);
        }
        if (!isFunction(method)) {
            throw new Error(`Method not found: ${req.method}`);
        }
        this.invokeLocalMethod(invocationId, method, args);
    }
    private invokeLocalMethod(invocationId: InvocationId, method: Method, args: unknown[]) {
        const onfulfilled = (result: unknown) => {
            const { data, transferables, functions } = serializeRequestData(this.portId, [result]);
            functions.forEach((func, functionId) => {
                this.callbacks.set(functionId, func);
            });
            const ret: ReturnMethodMessage = {
                invocationId,
                action: 'method-return',
                status: 'success',
                result: data[0] as SerializableData,
                timestamp: Date.now(),
            };
            this.transport.send(ret as unknown as SerializableData, Array.from(transferables));
        };
        const onrejected = (reason: unknown) => {
            const ret: ReturnMethodMessage = {
                invocationId,
                action: 'method-return',
                status: 'error',
                error: {
                    message: reason instanceof Error ? reason.message : String(reason),
                    stack: reason instanceof Error ? reason.stack : undefined,
                },
                timestamp: Date.now(),
            };
            this.transport.send(ret as unknown as SerializableData, []);
        };
        try {
            const result = method(...args);
            if (isPromiseLike(result)) {
                result.then(onfulfilled, onrejected);
            } else {
                onfulfilled(result);
            }
        } catch (e) {
            onrejected(e);
        }
    }

    private handleMethodReturn(req: ReturnMethodMessage) {
        const defer = this.invocationDefers.get(req.invocationId.invocationId);
        if (defer) {
            if (req.status === 'success') {
                const result = deserializeRequestData([req.result], (callbackId, args) => {
                    return this.invokeRemoteMethod(callbackId, args);
                })[0];
                defer.resolve(result);
            } else {
                defer.reject(req.error);
            }
        }
        this.invocationDefers.delete(req.invocationId.invocationId);
    }
}
