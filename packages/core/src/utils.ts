export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function groupBy<T, K extends string>(array: T[], key: (item: T) => K): Record<K, T[]> {
  const grouped = {} as Record<K, T[]>;
  for (const item of array) {
    const groupKey = key(item);
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(item);
  }

  return new Proxy(grouped, {
    get: (target, key) => target[key as K] || [],
  });
}

export type Result<T, E> = { data: T; error?: undefined } | { data?: undefined; error: E };

export function runCatching<T, E = unknown>(callback: () => Promise<T>): Promise<Result<T, E>>;
export function runCatching<T, E = unknown>(callback: () => T): Result<T, E>;
export function runCatching<T, E = unknown>(
  callback: () => T | Promise<T>,
): Result<T, E> | Promise<Result<T, E>> {
  try {
    const result = callback();

    if (result instanceof Promise) {
      return result.then((data) => ({ data })).catch((error: E) => ({ error }));
    }

    return { data: result };
  } catch (error) {
    return { error: error as E };
  }
}
