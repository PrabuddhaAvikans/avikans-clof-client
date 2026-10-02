import type { ActionCreatorWithPayload, UnknownAction } from "@reduxjs/toolkit";
import {
  createAsyncEpic,
  type AppEpic,
  type FailurePayload,
  type RequestPayload,
  type SuccessPayload,
} from "@/app/store/async/createAsyncEpic";

export type CreateApiEpicOptions<TArg, TData> = {
  /** Action that starts the request (payload: `{ arg, key?, requestId? }`). */
  request: ActionCreatorWithPayload<RequestPayload<TArg>>;
  /** Dispatched with `{ data, key?, requestId?, arg }` on success. */
  success: ActionCreatorWithPayload<SuccessPayload<TData>>;
  /** Dispatched with `{ error, key?, requestId?, arg }` on failure. */
  failure: ActionCreatorWithPayload<FailurePayload>;
  /**
   * Run the side effect. Call `http.get/post/...`, map DTOs, return domain data.
   * Errors thrown here become failure actions (and reject mutateAsync).
   */
  execute: (arg: TArg) => Promise<TData>;
  /**
   * - `switch` (default): cancel in-flight work for the same cache key (queries).
   * - `merge`: allow parallel runs (mutations).
   */
  concurrency?: "switch" | "merge";
  /** Extra actions after a successful response (cross-slice invalidation, etc.). */
  onSuccess?: (data: TData, arg: TArg) => UnknownAction[];
};

/**
 * Epic factory for API work.
 * One epic = one operation. Explicit actions, explicit execute.
 * `execute` arg/result types are inferred from `request` / `success`.
 */
export function createApiEpic<TArg, TData>(
  options: CreateApiEpicOptions<TArg, TData>,
): AppEpic {
  return createAsyncEpic({
    request: options.request,
    success: options.success,
    failure: options.failure,
    mode: options.concurrency ?? "switch",
    onSuccess: options.onSuccess,
    handler: options.execute,
  });
}
