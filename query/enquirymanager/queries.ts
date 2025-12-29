import { useMutation, useQuery } from "@tanstack/react-query"
import { AcceptEnquiryEdits, ActivateDeactivateEqAgents, ActivateEqCamp, AddEqUser, AddNewCampContact, AddNewContactAgent, AddNewEnquiry, AddNewEqArea, AddNewEqCamp, AssignEqCamptoEnquiry, CloseEqnuiry, EnquiryToProject, ForwardEnquiryByStaff, ForwardHistory, GetAccessEnquiriesForStaffs, GetAgentEnquiries, GetAgentsByBusiness, GetAllEnquiryHistoryForStaffs, GetEnquiriesWithFilters, GetEnquiryById, GetEnquiryByIdForStaffs, GetEnquiryContacts, GetEnquiryHistories, GetEnquiryHistoryById, GetEqAgentByID, GetEqAreaById, GetEqAreaProfile, GetEqAreasByCity,
     GetEqAreasFiltered,
     GetEqCampsByArea, 
     GetEqCampsByEnquiry, 
     GetEqCampsById, 
     GetEqCampsFiltered, 
     GetEqCitiesByProvince, 
     GetEqCountries, 
     GetEqEdit, 
     GetEqLatestActionForStaff, 
     GetEqProvincesByRegion, 
     GetEqRegionsByCountry, 
     GetEqUserLogs, 
     GetEqUserProfile, 
     GetEqUsers,
     GetUserAssignedEnquiries,
     PutEnquiryEditReq,
     RemoveEnquiry,
     RemoveEnquiryAgent,
     RemoveEqCamp,
     RemoveEqUsers,
     UpdateEnquiry,
     UpdateEqArea,
     UpdateEqCamp,
     UpdateEqCampContact
    } from "./function"


//Get Countries
export const useGetEqCountries = () => {
    return useMutation({
        mutationFn: () => GetEqCountries(),
    })
};

//Get regions
export const useGetEqRegions = (country_id: string) => {
    return useQuery({
        queryKey: ["regions", country_id],
        queryFn: () => GetEqRegionsByCountry(country_id),
        enabled: !!country_id,
    })
}

//Get Provinces
export const useGetEqProvince = (region_id: string) => {
    return useQuery({
        queryKey: ["provinces", region_id],
        queryFn: () => GetEqProvincesByRegion(region_id),
        enabled: !!region_id
    })
}

//Get Cities
export const useGetEqCities = (province_id:string) => {
    return useQuery({
        queryKey: ["cities", province_id],
        queryFn: () => GetEqCitiesByProvince(province_id),
        enabled: !!province_id
    })
}

//Get Areas
export const useGetEqAreas = (city_id: string) => {
    return useQuery({
        queryKey: ["areas", city_id],
        queryFn: () => GetEqAreasByCity(city_id),
        enabled: !!city_id
    })
}

//Get Camps
export const useGetEqCampsByArea = (area_id: string) => {
    return useQuery({
        queryKey: ["camps", area_id],
        queryFn: () => GetEqCampsByArea(area_id),
        enabled: !!area_id
    })
}

//Get Areas filtered
export const useGetEqAreasFiltered = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["areas", queryParams],
        queryFn: () => GetEqAreasFiltered(queryParams),
    })
}

//Add New Area
export const useAddNewEqArea = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqArea(payload),
    })
}

//Get Camps filtered
export const useGetEqCampsFiltered = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["camps", queryParams],
        queryFn: () => GetEqCampsFiltered(queryParams),
    })
}

//Add New Camp
export const useAddNewEqCamp = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqCamp(payload),
    })
}

//Add new enquiry
export const useAddNewEnquiry = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEnquiry(payload),
    })
}

//Get enquiries by agent
export const useGetEnquiriesByAgent = () => {
    return useQuery({
        queryKey: ["enquiries"],
        queryFn: () => GetAgentEnquiries(),
    })
}

//Get Agents with search
export const useGetAgentsByBusiness = (business_id: string, search: string) => {
    return useQuery({
        queryKey: ["agents", search],
        queryFn: () => GetAgentsByBusiness(business_id, search),
        enabled: !!business_id,
    })
}

//Get Enquiries with Filters
export const useGetEnquiriesWithFilters = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["enquiries", queryParams],
        queryFn: () => GetEnquiriesWithFilters(queryParams),
    })
}

//Get Enquiry by ID
export const useGetEnquiryById = (enquiry_id:string) => {
    return useQuery({
        queryKey: ["enquiry", enquiry_id],
        queryFn: () => GetEnquiryById(enquiry_id),
        enabled: !!enquiry_id
    })
}

//Forward History
export const useForwardHistory = () => {
    return useMutation({
        mutationFn: (payload: any) => ForwardHistory(payload), 
    })
}

//Get Enquiry Users
export const useGetEqUsers = (business_id: string, user_type: string) => {
    return useQuery({
        queryKey: ["users", user_type],
        queryFn: () => GetEqUsers(business_id, user_type),
        enabled: !!business_id
    })
}

//Add Enquiry Users
export const useAddEqUser = () => {
    return useMutation({
        mutationFn: (payload: any) => AddEqUser(payload),
    })
}

//Get All Histories of Enquiry
export const useGetEnquiryHistories = (enquiry_id: string) => {
    return useQuery({
        queryKey: ["histories", enquiry_id],
        queryFn: () => GetEnquiryHistories(enquiry_id),
        enabled: !!enquiry_id,
    })
}

//Get Enquiry History by ID
export const useGetEnquiryHistoryById = (history_id:string) => {
    return useQuery({
        queryKey: ["history", history_id],
        queryFn: () => GetEnquiryHistoryById(history_id),
        enabled: !!history_id,
    })
}

//Get Access Enquiries for staffs
export const useGetAccessEnquiriesForStaffs = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["enquiries", queryParams],
        queryFn: () => GetAccessEnquiriesForStaffs(queryParams),
    })
}

//Get Enquiry by ID for Staffs
export const useGetEnquiryByIdForStaffs = (enquiry_id: string) => {
    return useQuery({
        queryKey: ["enquiry", enquiry_id],
        queryFn: ()=> GetEnquiryByIdForStaffs(enquiry_id),
        enabled: !!enquiry_id
    })
}

//Get All Enquiry Histories for staffs
export const useGetAllEnquiryHistoryForStaffs = (enquiry_id:string) => {
    return useQuery({
        queryKey: ["histories", enquiry_id],
        queryFn: ()=> GetAllEnquiryHistoryForStaffs(enquiry_id),
        enabled: !!enquiry_id
    })
}

//Get User Assinged Enquiries
export const useGetUserAssignedEnquiries = (queryParams: Record <string, string | undefined>) => {
    return useQuery({
        queryKey: ["enquiries", queryParams],
        queryFn: () => GetUserAssignedEnquiries(queryParams),
    })
}

//Update / Activate Area
export const useUpdateEqArea = () => {
    return useMutation({
        mutationFn: (payload: any)=> UpdateEqArea(payload),
    })
}

//Update Camp
export const useUpdateEqCamp = () => {
    return useMutation({
        mutationFn: (payload:any) => UpdateEqCamp(payload),
    })
}

//Get Area by Id
export const useGetEqAreaById = (area_id: string) => {
    return useQuery({
        queryKey: ["area", area_id],
        queryFn: () => GetEqAreaById(area_id),
        enabled: !!area_id
    })
}

//Get Camp by Id
export const useGetEqCampById = (enquiry_id: string, is_new:boolean) => {
    return useQuery({
        queryKey: ["camp", is_new],
        queryFn: () => GetEqCampsByEnquiry(enquiry_id, is_new),
        enabled: !!enquiry_id
    })
}

//Activate Camp
export const useActivateEqCamp = () => {
    return useMutation({
        mutationFn: (payload:any) => ActivateEqCamp(payload),
    })
}

//Update Enquiry (Admin)
export const useUpdateEnquiry = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEnquiry(payload),
    })
}



// Get Agent by ID
export const useGetEqAgentByID = (agent_id: string) => {
    return useQuery({
        queryKey: ["agent", agent_id],
        queryFn: () => GetEqAgentByID(agent_id),
        enabled: !!agent_id
    })
}

//Forward Enquiry by User / staff
export const useForwardEnquiryByStaff = () => {
    return useMutation({
        mutationFn: (payload:any) => ForwardEnquiryByStaff(payload),
    })
}

//Get Eq Latest Action for users
export const useGetEqLatestActionForStaff = (enquiry_id:string) => {
    return useQuery({
        queryKey: ["action", enquiry_id],
        queryFn: () => GetEqLatestActionForStaff(enquiry_id),
        enabled: !!enquiry_id
    })
}

//Get Eq User profile
export const useGetEqUserProfile = (user_id: string) => {
    return useQuery({
        queryKey: ["user", user_id],
        queryFn: () => GetEqUserProfile(user_id),
        enabled: !!user_id
    })
}

//Get Eq user logs 
export const useGetEqUserLogs = (user_id: string) => {
    return useQuery({
        queryKey: ["user_logs", user_id],
        queryFn: () => GetEqUserLogs(user_id),
        enabled: !!user_id
    })
}

//Assign Camp to Enquiry
export const useAssignEqCamptoEnquiry = () => {
    return useMutation({
        mutationFn: (payload: any) => AssignEqCamptoEnquiry(payload),
    })
}

//Get EQ Camps by ID
export const useGetEqCampsById = (camp_id: string) => {
    return useQuery({
        queryKey: ["camp", camp_id],
        queryFn: () => GetEqCampsById(camp_id),
        enabled: !!camp_id
    })
}

//Get Eq area profile
export const useGetEqAreaProfile = (area_id: string) => {
    return useQuery({
        queryKey: ["area", area_id],
        queryFn: () => GetEqAreaProfile(area_id),
        enabled: !!area_id
    })
}

//Activate / Deactivate Eq Agents
export const useActivateDeactivateEqAgents = () => {
    return useMutation({
        mutationFn: (agent_id: string) => ActivateDeactivateEqAgents(agent_id),
    })
}

//Update Eq Camp Contact
export const useUpdateEqCampContact = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEqCampContact(payload),
    })
}

//Get Enquiry Contacts
export const useGetEnquiryContacts = (enquiry_id:string) => {
    return useQuery({
        queryKey: ["contacts", enquiry_id],
        queryFn: () => GetEnquiryContacts(enquiry_id),
        enabled: !!enquiry_id
    })
}

//Enquiry Edit Request
export const usePutEnquiryEditReq = () => {
    return useMutation({
        mutationFn: (payload: any) => PutEnquiryEditReq(payload),
    })
}

//Get Enquiry Edit
export const useGetEqEdit = (enquiry_id: string) => {
    return useQuery({
        queryKey: ["enquiry", enquiry_id],
        queryFn: () => GetEqEdit(enquiry_id),
        enabled: !!enquiry_id
    })
}

//Accept Enquiry Edits
export const useAcceptEnquiryEdits = () => {
    return useMutation({
        mutationFn: (payload: any) => AcceptEnquiryEdits(payload),
    })
}

//Add New Camp Contact
export const useAddNewCampContact = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewCampContact(payload),
    })
}

//Add New Contact (Agent Side)
export const useAddNewContactAgent = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewContactAgent(payload),
    })
}

//Convert Enquiry to Project
export const useEnquiryToProject = () => {
    return useMutation({
        mutationFn: (payload: any) => EnquiryToProject(payload),
    })
}

//Close Enquiry
export const useCloseEqnuiry = () => {
    return useMutation({
        mutationFn: (payload: any) => CloseEqnuiry(payload),
    })
}

//Remove Camp
export const useRemoveEqCamp = () => {
    return useMutation({
        mutationFn: (camp_id: string) => RemoveEqCamp(camp_id),
    })
}

//Remove Enquiry Users
export const useRemoveEqUsers = () => {
    return useMutation({
        mutationFn: (user_id: string) => RemoveEqUsers(user_id),
    })
}

//Remove Enquiry Agent
export const useRemoveEnquiryAgent = () => {
    return useMutation({
        mutationFn: (agent_id: string) => RemoveEnquiryAgent(agent_id),
    })
}

//Remove Enquiry
export const useRemoveEnquiry = () => {
    return useMutation({
        mutationFn: (enquiry_id: string) => RemoveEnquiry(enquiry_id),
    })
}
