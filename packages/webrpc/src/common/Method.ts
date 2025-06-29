export type Method = (...args: unknown[]) => unknown;
export type AsyncMethod = (...args: unknown[]) => Promise<unknown>;
export type VoidMethod = (...args: unknown[]) => void;
