export type SerializableData =
    | string
    | number
    | boolean
    | null
    | undefined
    | SerializableData[]
    | { [key: string | number]: SerializableData };
