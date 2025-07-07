export interface Constructor<T> {
    readonly prototype: T;
    new (...args: unknown[]): T;
}

export type PromisifyFunction<F> = F extends (...args: infer P) => infer R
    ? (...args: P) => Promise<R extends Promise<infer P> ? P : R>
    : F;

type FilterOutAttributes<Base> = {
    [Key in keyof Base]: Base[Key] extends (...args: any[]) => any ? Base[Key] : never;
};

export type PromisifyClass<P> = Constructor<PromisifyObject<P>>;

export type PromisifyObject<P, T extends { [key: string]: (...args: any[]) => any } = FilterOutAttributes<P>> = {
    [Key in keyof T]: ReturnType<T[Key]> extends Promise<unknown> ? T[Key] : PromisifyFunction<T[Key]>;
};
