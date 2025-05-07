export declare const sleep: (ms: number) => Promise<unknown>;
export declare function groupBy<T, K extends string>(array: T[], key: (item: T) => K): Record<K, T[]>;
export type Result<T, E> = {
    data: T;
    error?: undefined;
} | {
    data?: undefined;
    error: E;
};
export declare function runCatching<T, E = unknown>(callback: () => Promise<T>): Promise<Result<T, E>>;
export declare function runCatching<T, E = unknown>(callback: () => T): Result<T, E>;
