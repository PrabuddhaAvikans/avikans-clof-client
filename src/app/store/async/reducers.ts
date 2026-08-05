import type { Draft, PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createAsyncEntry,
  createMutationEntry,
  type AsyncEntry,
  type MutationEntry,
} from "@/app/store/async/types";

export function setEntryLoading<T>(
  map: Record<string, AsyncEntry<T>>,
  key: string,
): void {
  const existing = map[key];
  map[key] = {
    data: existing?.data,
    status: "loading",
    error: null,
  };
}

export function setEntrySuccess<T>(
  map: Record<string, AsyncEntry<T>>,
  action: PayloadAction<SuccessPayload<T>>,
): void {
  const key = action.payload.key;
  if (!key) return;
  map[key] = {
    data: action.payload.data,
    status: "succeeded",
    error: null,
  };
}

export function setEntryFailure<T>(
  map: Record<string, AsyncEntry<T>>,
  action: PayloadAction<FailurePayload>,
): void {
  const key = action.payload.key;
  if (!key) return;
  const existing = map[key];
  map[key] = {
    data: existing?.data,
    status: "failed",
    error: action.payload.error,
  };
}

export function invalidateEntries<T>(map: Draft<Record<string, AsyncEntry<T>>>): void {
  for (const key of Object.keys(map)) {
    const entry = map[key];
    map[key] = {
      data: entry.data,
      status: "idle",
      error: null,
    };
  }
}

export function setMutationLoading(entry: MutationEntry): void {
  entry.status = "loading";
  entry.error = null;
}

export function setMutationSuccess(entry: MutationEntry): void {
  entry.status = "succeeded";
  entry.error = null;
}

export function setMutationFailure(
  entry: MutationEntry,
  action: PayloadAction<FailurePayload>,
): void {
  entry.status = "failed";
  entry.error = action.payload.error;
}

export function emptyCache<T>(): Record<string, AsyncEntry<T>> {
  return {};
}

export { createAsyncEntry, createMutationEntry };
