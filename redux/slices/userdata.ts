import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
    superAdmin: any;
    user_role: any;
    currentUser: any;
    businessData: any;
}

const initialState: UserState = {
    superAdmin: null,
    user_role: null,
    currentUser: null,
    businessData: null
}

const userDataSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        loadSuperAdmin: (state, action: PayloadAction<any>) => {
            state.superAdmin = action.payload
        },
        loadUserRole: (state, action: PayloadAction<any>) => {
            state.user_role = action.payload
        },
        loadCurrentUser: (state, action: PayloadAction<any>) => {
            state.currentUser = action.payload
        },
        loadBusinessData: (state, action: PayloadAction<any>) => {
            state.businessData = action.payload
        }
    }
})

export const { loadSuperAdmin, loadUserRole, loadCurrentUser, loadBusinessData } = userDataSlice.actions
export default userDataSlice.reducer
