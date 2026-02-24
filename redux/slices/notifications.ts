import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface NotificationsState {
  unreadCount: number;
}

const initialState: NotificationsState = {
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = Math.max(0, action.payload);
    },
    incrementUnreadCount: (state, action: PayloadAction<number | undefined>) => {
      const incrementBy = action.payload ?? 1;
      state.unreadCount = Math.max(0, state.unreadCount + incrementBy);
    },
    decrementUnreadCount: (state, action: PayloadAction<number | undefined>) => {
      const decrementBy = action.payload ?? 1;
      state.unreadCount = Math.max(0, state.unreadCount - decrementBy);
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const {
  setUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
  resetUnreadCount,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
