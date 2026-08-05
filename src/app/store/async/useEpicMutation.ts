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
};

export function useEpicMutation<TArg, TData = unknown>({
  request,
  selectMutation,
}: UseEpicMutationOptions<TArg, TData>) {
  const dispatch = useDispatch<AppDispatch>();
  const mutation = useSelector(selectMutation);
  const isPending = mutation.status === "loading";

  const mutateAsync = useCallback(
    (arg: TArg) => {
      const { requestId, promise } = registerDeferred<TData>();
      dispatch(request({ arg, requestId }) as UnknownAction);
      return promise;
    },
    [dispatch, request],
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
