import { from, of } from "rxjs";
import { catchError, filter, mergeMap, switchMap } from "rxjs/operators";
import type { ActionCreatorWithPayload, UnknownAction } from "@reduxjs/toolkit";
import type { Epic } from "redux-observable";
import { rejectDeferred, resolveDeferred } from "@/app/store/async/deferred";
import { toErrorMessage } from "@/app/store/async/types";

export type AppEpic = Epic<UnknownAction, UnknownAction, unknown>;

export type RequestPayload<TArg> = {
  arg: TArg;
  key?: string;
  requestId?: string;
};

export type SuccessPayload<TData> = {
  data: TData;
  key?: string;
  requestId?: string;
  arg?: unknown;
};

export type FailurePayload = {
  error: string;
  key?: string;
  requestId?: string;
  arg?: unknown;
};

type AsyncEpicOptions<TArg, TData> = {
  request: ActionCreatorWithPayload<RequestPayload<TArg>>;
  success: ActionCreatorWithPayload<SuccessPayload<TData>>;
  failure: ActionCreatorWithPayload<FailurePayload>;
  handler: (arg: TArg) => Promise<TData>;
  /** Prefer switchMap for queries (cancel in-flight); mergeMap for mutations. */
  mode?: "switch" | "merge";
  /** Extra actions to emit after a successful response. */
  onSuccess?: (data: TData, arg: TArg) => UnknownAction[];
};

export function createAsyncEpic<TArg, TData>(
  options: AsyncEpicOptions<TArg, TData>,
): AppEpic {
  const flatten = options.mode === "merge" ? mergeMap : switchMap;

  return (action$) =>
    action$.pipe(
      filter(options.request.match),
      flatten((action) => {
        const { arg, key, requestId } = action.payload;
        return from(options.handler(arg)).pipe(
          mergeMap((data) => {
            resolveDeferred(requestId, data);
            const actions: UnknownAction[] = [
              options.success({ data, key, requestId, arg }),
              ...(options.onSuccess?.(data, arg) ?? []),
            ];
            return of(...actions);
          }),
          catchError((error: unknown) => {
            rejectDeferred(requestId, error);
            return of(
              options.failure({
                error: toErrorMessage(error),
                key,
                requestId,
                arg,
              }),
            );
          }),
        );
      }),
    );
}
