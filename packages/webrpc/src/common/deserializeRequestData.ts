import { isCallback } from '../protocol/Callback';
import { isGetter } from '../protocol/Getter';
import { isPlainObject } from './isPlainObject';

export function deserializeRequestData(
    data: unknown[],
    invokeCallback: (callbackId: string, args: unknown[]) => Promise<unknown>,
    cleanupCallback: (callbackId: string) => void
) {
    // Tracks objects that have already been transformed to handle circular references.
    const handled = new Map<unknown, unknown>();
    const registry = new FinalizationRegistry(cleanupCallback);

    const transform = (value: unknown) => {
        if (handled.has(value)) {
            return handled.get(value);
        }
        if (isCallback(value)) {
            const callback = (...args: unknown[]) => {
                return invokeCallback(value.id, args);
            };
            registry.register(callback, value.id);
            handled.set(value, callback);
            return callback;
        }
        if (Array.isArray(value)) {
            const result: unknown[] = [];
            // Immediately cache the array to handle circular references from within its elements.
            handled.set(value, result);
            const arr = value.map(it => {
                if (handled.has(it)) {
                    return handled.get(it);
                }
                const result = transform(it);
                handled.set(it, result);
                return result;
            });
            result.push(...arr);
            return result;
        } else if (isPlainObject(value)) {
            const object: Record<string, unknown> = {};
            // Immediately cache the object to handle circular references from within its properties.
            handled.set(value, object);

            const descriptors = Object.getOwnPropertyDescriptors(value);
            for (const key in descriptors) {
                const originalValue = value[key];
                if (isGetter(originalValue)) {
                    const descriptor = {
                        get: () => {
                            return invokeCallback(originalValue.id, []);
                        },
                    };
                    registry.register(descriptor.get, originalValue.id);
                    Object.defineProperty(object, key, descriptor);
                } else {
                    object[key] = transform(originalValue);
                }
            }
            return object;
        }
        return value;
    };
    return data.map(transform);
}
