export const CALLBACK_FLAG = '$$WEB-RPC-CALLBACK' as const;

export interface Callback {
    flag: typeof CALLBACK_FLAG;
    contextId: string;
    id: string;
}

export function isCallback(data: unknown): data is Callback {
    return typeof data === 'object' && data !== null && 'flag' in data && data.flag === CALLBACK_FLAG;
}
