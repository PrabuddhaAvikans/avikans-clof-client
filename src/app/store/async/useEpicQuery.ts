import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { ActionCreatorWithPayload, UnknownAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/app/store";
import { cacheKey } from "@/app/store/async/cacheKey";
import type { RequestPayload } from "@/app/store/async/createAsyncEpic";
import type { AsyncEntry } from "@/app/store/async/types";

type UseEpicQueryOptions<TArg, TData> = {
  arg: TArg;
  enabled?: boolean;
  getKey?: (arg: TArg) => string;
  request: ActionCreatorWithPayload<RequestPayload<TArg>>;
  selectEntry: (state: RootState, key: string) => AsyncEntry<TData> | undefined;
};

export function useEpicQuery<TArg, TData>({
  arg,
  enabled = true,
  getKey,
  request,
  selectEntry,
}: UseEpicQueryOptions<TArg, TData>) {
  const dispatch = useDispatch<AppDispatch>();
  const key = useMemo(
    () => (getKey ? getKey(arg) : cacheKey(arg)),
    [arg, getKey],
  );
  const entry = useSelector((state: RootState) => selectEntry(state, key));
  const status = entry?.status ?? "idle";
  const data = entry?.data;
  const activeKeyRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    if (!enabled) return;
    dispatch(request({ arg, key }) as UnknownAction);
  }, [arg, dispatch, enabled, key, request]);

  useEffect(() => {
    if (!enabled) return;

    const isNewMountForKey = activeKeyRef.current !== key;
    activeKeyRef.current = key;

    if (status === "idle") {
      dispatch(request({ arg, key }) as UnknownAction);
      return;
    }

    // After remount/login, retry a stuck failure that has no cached data.
    // Only on first observation of this key for this mount — avoids retry loops.
    if (isNewMountForKey && status === "failed" && data === undefined) {
      dispatch(request({ arg, key }) as UnknownAction);
    }
  }, [arg, data, dispatch, enabled, key, request, status]);

  const isLoading =
    enabled && (status === "idle" || status === "loading") && data === undefined;
  const isError = status === "failed";
  const error = entry?.error ? new Error(entry.error) : null;

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    status,
  };
}
