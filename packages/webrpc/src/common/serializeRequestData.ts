import { CALLBACK_FLAG } from '../protocol/Callback';
import { GETTER_FLAG, type Getter } from '../protocol/Getter';
import { isPlainObject } from './isPlainObject';
import { isTransferable } from './isTransferable';
import { isTypedArray } from './isTypedArray';
import type { Method } from './Method';
import uid from './uid';

export interface ProcessedRequestDataResult {
    functions: Map<string, Method>;
    transferables: Set<Transferable>;
    data: unknown[];
}

/**
 * Serializes request data by converting functions and getters to serializable objects
 */
export function serializeRequestData(contextId: string, data: unknown[]): ProcessedRequestDataResult {
    const functions = new Map<string, Method>();
    const processedItems = new Set<unknown>();
    const transferables = new Set<Transferable>();

    const createFunctionCallback = (func: Method) => {
        const functionId = uid('func-******');
        functions.set(functionId, func);
        return {
            flag: CALLBACK_FLAG,
            contextId,
            id: functionId,
        };
    };

    const createGetterObject = (getter: Method): Getter => {
        const functionId = uid('func-******');
        functions.set(functionId, getter);
        return {
            flag: GETTER_FLAG,
            contextId,
            id: functionId,
        };
    };

    const processPropertyDescriptor = (
        targetObject: Record<string, unknown>,
        key: string,
        descriptor: PropertyDescriptor,
        originalValue: unknown
    ) => {
        if (descriptor.get) {
            const getterObject = createGetterObject(descriptor.get);
            const newDescriptor: PropertyDescriptor = {
                configurable: descriptor.configurable,
                enumerable: descriptor.enumerable,
                writable: descriptor.writable,
                value: getterObject,
            };
            Object.defineProperty(targetObject, key, newDescriptor);
        } else if (typeof originalValue === 'function') {
            const newDescriptor: PropertyDescriptor = {
                configurable: descriptor.configurable,
                enumerable: descriptor.enumerable,
                writable: descriptor.writable,
                value: processValue(originalValue),
            };
            Object.defineProperty(targetObject, key, newDescriptor);
        } else {
            Object.defineProperty(targetObject, key, descriptor);
        }
    };

    const processPlainObject = (obj: Record<string, unknown>) => {
        const descriptors = Object.getOwnPropertyDescriptors(obj);
        const transformedObject = {};

        for (const key in descriptors) {
            const descriptor = descriptors[key];
            processPropertyDescriptor(transformedObject, key, descriptor, obj[key]);
        }

        return transformedObject;
    };

    const collectTransferables = (value: unknown) => {
        if (isTypedArray(value)) {
            transferables.add(value.buffer);
        } else if (isTransferable(value)) {
            transferables.add(value);
        }
    };

    const processValue = (value: unknown): unknown => {
        if (processedItems.has(value)) {
            return value;
        }
        processedItems.add(value);

        if (Array.isArray(value)) {
            return value.map(item => processValue(item));
        }

        if (isPlainObject(value)) {
            return processPlainObject(value);
        }

        if (typeof value === 'function') {
            return createFunctionCallback(value as Method);
        }

        collectTransferables(value);

        return value;
    };

    const processedData = data.map(item => processValue(item));

    return {
        functions,
        transferables,
        data: processedData,
    };
}
