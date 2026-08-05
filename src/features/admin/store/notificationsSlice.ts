import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createMutationEntry,
  emptyCache,
  invalidateEntries,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
  setMutationFailure,
  setMutationLoading,
  setMutationSuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry, MutationEntry } from "@/app/store/async/types";
import type { NotificationListFilters } from "@/services";
import type { AppNotification } from "@/types/notification";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<AppNotification>;

export type NotificationsState = {
  lists: Record<string, AsyncEntry<ListData>>;
  unreadCounts: Record<string, AsyncEntry<number>>;
  markAsRead: MutationEntry;
  markAllAsRead: MutationEntry;
};

const initialState: NotificationsState = {
  lists: emptyCache(),
  unreadCounts: emptyCache(),
  markAsRead: createMutationEntry(),
  markAllAsRead: createMutationEntry(),
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    fetchListRequest(
      state,
      action: PayloadAction<RequestPayload<NotificationListFilters>>,
    ) {
      if (action.payload.key) setEntryLoading(state.lists, action.payload.key);
    },
    fetchListSuccess(state, action: PayloadAction<SuccessPayload<ListData>>) {
      setEntrySuccess(state.lists, action);
    },
    fetchListFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.lists, action);
    },

    fetchUnreadCountRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.unreadCounts, action.payload.key);
    },
    fetchUnreadCountSuccess(state, action: PayloadAction<SuccessPayload<number>>) {
      setEntrySuccess(state.unreadCounts, action);
    },
    fetchUnreadCountFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.unreadCounts, action);
    },

    markAsReadRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.markAsRead);
    },
    markAsReadSuccess(state, _action: PayloadAction<SuccessPayload<AppNotification>>) {
      setMutationSuccess(state.markAsRead);
      invalidateEntries(state.lists);
      invalidateEntries(state.unreadCounts);
    },
    markAsReadFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.markAsRead, action);
    },

    markAllAsReadRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.markAllAsRead);
    },
    markAllAsReadSuccess(state, _action: PayloadAction<SuccessPayload<void>>) {
      setMutationSuccess(state.markAllAsRead);
      invalidateEntries(state.lists);
      invalidateEntries(state.unreadCounts);
    },
    markAllAsReadFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.markAllAsRead, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.unreadCounts);
    },
  },
});

export const notificationsActions = notificationsSlice.actions;
export default notificationsSlice.reducer;
