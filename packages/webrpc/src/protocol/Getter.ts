export const GETTER_FLAG = '$$WEB-RPC-GETTER' as const;

export interface Getter {
    flag: typeof GETTER_FLAG;
    contextId: string;
    id: string;
}

export function isGetter(data: unknown): data is Getter {
    return typeof data === 'object' && data !== null && 'flag' in data && data.flag === GETTER_FLAG;
}
