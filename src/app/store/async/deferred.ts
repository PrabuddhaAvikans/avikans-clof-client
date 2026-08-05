type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const registry = new Map<string, Deferred<unknown>>();

export function registerDeferred<T>(): {
  requestId: string;
  promise: Promise<T>;
} {
  const requestId = crypto.randomUUID();
  const promise = new Promise<T>((resolve, reject) => {
    registry.set(requestId, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
  });
  return { requestId, promise };
}

export function resolveDeferred<T>(requestId: string | undefined, value: T): void {
  if (!requestId) return;
  const deferred = registry.get(requestId);
  if (!deferred) return;
  registry.delete(requestId);
  deferred.resolve(value);
}

export function rejectDeferred(
  requestId: string | undefined,
  error: unknown,
): void {
  if (!requestId) return;
  const deferred = registry.get(requestId);
  if (!deferred) return;
  registry.delete(requestId);
  deferred.reject(error);
}
