export const SETTER_FLAG = '$$WEB-RPC-SETTER' as const;

export interface Setter {
    flag: typeof SETTER_FLAG;
    contextId: string;
    id: string;
}

export function isSetter(data: unknown): data is Setter {
    return typeof data === 'object' && data !== null && 'flag' in data && data.flag === SETTER_FLAG;
}
