export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return typeof value === 'object' && value !== null && 'then' in value;
}
