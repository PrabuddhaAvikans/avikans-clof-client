export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export type AsyncEntry<T> = {
  data: T | undefined;
  status: AsyncStatus;
  error: string | null;
};

export type MutationEntry = {
  status: AsyncStatus;
  error: string | null;
};

export function createAsyncEntry<T>(data?: T): AsyncEntry<T> {
  return {
    data,
    status: data === undefined ? "idle" : "succeeded",
    error: null,
  };
}

export function createMutationEntry(): MutationEntry {
  return { status: "idle", error: null };
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Request failed";
}
