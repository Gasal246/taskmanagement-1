import { configureStore } from '@reduxjs/toolkit';
import applicationReducer from './slices/application';
import userDataReducer from './slices/userdata';

export const store = configureStore({
  reducer: {
    application: applicationReducer,
    user: userDataReducer
  },
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

