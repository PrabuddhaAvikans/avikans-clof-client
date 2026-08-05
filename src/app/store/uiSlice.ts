import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface RightDrawerState {
  open: boolean;
  title: string;
  contentId: string | null;
  entityId: string | null;
}

export interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  rightDrawer: RightDrawerState;
  globalSearchOpen: boolean;
}

const initialRightDrawer: RightDrawerState = {
  open: false,
  title: "",
  contentId: null,
  entityId: null,
};

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileNavOpen: false,
  rightDrawer: initialRightDrawer,
  globalSearchOpen: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    toggleMobileNavOpen(state) {
      state.mobileNavOpen = !state.mobileNavOpen;
    },
    openRightDrawer(
      state,
      action: PayloadAction<{
        title: string;
        contentId: string;
        entityId?: string | null;
      }>,
    ) {
      state.rightDrawer = {
        open: true,
        title: action.payload.title,
        contentId: action.payload.contentId,
        entityId: action.payload.entityId ?? null,
      };
    },
    closeRightDrawer(state) {
      state.rightDrawer = initialRightDrawer;
    },
    setGlobalSearchOpen(state, action: PayloadAction<boolean>) {
      state.globalSearchOpen = action.payload;
    },
    toggleGlobalSearchOpen(state) {
      state.globalSearchOpen = !state.globalSearchOpen;
    },
  },
});

export const {
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setMobileNavOpen,
  toggleMobileNavOpen,
  openRightDrawer,
  closeRightDrawer,
  setGlobalSearchOpen,
  toggleGlobalSearchOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
