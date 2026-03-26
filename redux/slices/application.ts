import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ApplicationState {
    businessAdded: any;
    businessPlan: any;
    businessAdmins: any[];
    businessDocs: any[];
    businessStaff: any;
    user_info: any;
    regionData: any;
    departmentData: any;
    areaData: any;
    locationData: any;
    filteredStaffs: any[] | null;
    staffFilterValues: any;
    enquiriesListPage: number;
    adminEnquiriesListState: any;
    staffEnquiriesListState: any;
};

const initialState: ApplicationState = {
    businessAdded: null,
    businessPlan: null,
    businessAdmins: [],
    businessDocs: [],
    businessStaff: null,
    user_info: null,
    regionData: null,
    departmentData: null,
    areaData: null,
    locationData: null,
    filteredStaffs: null,
    staffFilterValues: null,
    enquiriesListPage: 1,
    adminEnquiriesListState: null,
    staffEnquiriesListState: null,
};

const applicationSlice = createSlice({
    name: "application",
    initialState,
    reducers: {
        loadAdminBusiness: (state, action: PayloadAction<any>) => {
            state.businessAdded = action.payload
        },
        loadAdminBusinessPlan: (state, action: PayloadAction<any>) => {
            state.businessPlan = action.payload
        },
        loadAdminBusinessAdmins: (state, action: PayloadAction<any[]>) => {
            state.businessAdmins = action.payload
        },
        loadAdminBusinessDocs: (state, action: PayloadAction<any[]>) => {
            state.businessDocs = action.payload
        },
        loadAdminBusinessStaff: (state, action: PayloadAction<any>) => {
            state.businessStaff = action.payload
        },
        loadUserInfo: (state, action: PayloadAction<any>) => {
            state.user_info = action.payload
        },
        loadRegionData: (state, action: PayloadAction<any>) => {
            state.regionData = action.payload
        },
        loadDepartmentData: (state, action: PayloadAction<any>) => {
            state.departmentData = action.payload
        },
        loadAreaData: (state, action: PayloadAction<any>) => {
            state.areaData = action.payload
        },
        loadLocationData: (state, action: PayloadAction<any>) => {
            state.locationData = action.payload
        },
        loadFilteredStaffs: (state, action: PayloadAction<any[]>) => {
            state.filteredStaffs = action.payload
        },
        loadStaffFilterValues: (state, action: PayloadAction<any>) => {
            state.staffFilterValues = action.payload
        },
        loadEnquiriesListPage: (state, action: PayloadAction<number>) => {
            state.enquiriesListPage = Math.max(1, Number(action.payload) || 1)
        },
        loadAdminEnquiriesListState: (state, action: PayloadAction<any>) => {
            state.adminEnquiriesListState = action.payload
        },
        loadStaffEnquiriesListState: (state, action: PayloadAction<any>) => {
            state.staffEnquiriesListState = action.payload
        }
    }
});

export const { 
    loadAdminBusiness,
    loadAdminBusinessPlan,
    loadAdminBusinessAdmins,
    loadAdminBusinessDocs,
    loadAdminBusinessStaff,
    loadUserInfo,
    loadRegionData,
    loadDepartmentData,
    loadAreaData,
    loadLocationData,
    loadFilteredStaffs,
    loadStaffFilterValues,
    loadEnquiriesListPage,
    loadAdminEnquiriesListState,
    loadStaffEnquiriesListState
} = applicationSlice.actions
export default applicationSlice.reducer
