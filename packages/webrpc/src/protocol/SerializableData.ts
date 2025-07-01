import type { TypedArray } from '../common/TypedArray';

export type SerializableData =
    | string
    | number
    | boolean
    | null
    | undefined
    | TypedArray
    | ArrayBuffer
    | SerializableData[]
    | { [key: string | number]: SerializableData };
