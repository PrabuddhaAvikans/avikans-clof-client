import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { ActionCreatorWithPayload, UnknownAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/app/store";
import type { RequestPayload } from "@/app/store/async/createAsyncEpic";
import { registerDeferred } from "@/app/store/async/deferred";
import type { MutationEntry } from "@/app/store/async/types";

type UseEpicMutationOptions<TArg, TData> = {
  request: ActionCreatorWithPayload<RequestPayload<TArg>>;
  selectMutation: (state: RootState) => MutationEntry;
  /** Optional cache/group key so switch/merge concurrency is scoped (e.g. by entity id). */
  key?: (arg: TArg) => string;
};

export function useEpicMutation<TArg, TData = unknown>({
  request,
  selectMutation,
  key,
}: UseEpicMutationOptions<TArg, TData>) {
  const dispatch = useDispatch<AppDispatch>();
  const mutation = useSelector(selectMutation);
  const isPending = mutation.status === "loading";

  const mutateAsync = useCallback(
    (arg: TArg) => {
      const { requestId, promise } = registerDeferred<TData>();
      dispatch(request({ arg, requestId, key: key?.(arg) }) as UnknownAction);
      return promise;
    },
    [dispatch, key, request],
  );

  const mutate = useCallback(
    (arg: TArg) => {
      void mutateAsync(arg);
    },
    [mutateAsync],
  );

  return {
    mutateAsync,
    mutate,
    isPending,
    isError: mutation.status === "failed",
    error: mutation.error ? new Error(mutation.error) : null,
    status: mutation.status,
  };
}
