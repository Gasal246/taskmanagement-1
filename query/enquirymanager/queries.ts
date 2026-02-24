import { useMutation, useQuery } from "@tanstack/react-query"
import { AcceptEnquiryEdits, ActivateDeactivateEqAgents, ActivateEqCamp, AddEqUser, AddNewCampContact, AddNewContactAgent, AddNewEnquiry, AddNewEqArea, AddNewEqCamp, AddNewEqCity, AddNewEqCountry, AddNewEqHeadOffice, AddNewEqProvince, AddNewEqRegion, AddNewStaffEqHeadOffice, AssignEqCamptoEnquiry, CloseEqnuiry, EnquiryToProject, ForwardEnquiryByStaff, ForwardHistory, GetAccessEnquiriesForStaffs, GetAgentEnquiries, GetAgentsByBusiness, GetAllEnquiryHistoryForStaffs, GetEnquiriesWithFilters, GetEnquiryById, GetEnquiryByIdForStaffs, GetEnquiryContacts, GetEnquiryHistories, GetEnquiryHistoryById, GetEqAgentByID, GetEqAreaById, GetEqAreaProfile, GetEqAreasByCity,
     GetEqAreasFiltered,
     GetEqCampsByArea, 
     GetEqCampsByEnquiry, 
     GetEqCampsById, 
     GetEqCampsFiltered, 
     GetStaffEqCampsFiltered,
     GetEqCitiesByProvince, 
     GetEqCitiesFiltered,
     GetEqCityProfile,
     GetEqCountries, 
     GetEqCountriesFiltered,
     GetEqCountryProfile,
     GetEqEdit, 
     GetEqHeadOfficesFiltered,
     GetEqHeadOfficeProfile,
     GetEqLatestActionForStaff, 
     GetEqProvincesByRegion, 
     GetEqProvincesFiltered,
     GetEqProvinceProfile,
     GetEqRegionsByCountry, 
     GetEqRegionsFiltered,
     GetEqRegionProfile,
     GetEqUserLogs, 
     GetEqUserProfile, 
     GetEqUsers,
     GetStaffEqHeadOfficeProfile,
     GetStaffEqHeadOfficesFiltered,
     GetUserAssignedEnquiries,
     ExportEnquiries,
     PutEnquiryEditReq,
     RemoveEnquiry,
     RemoveEnquiryAgent,
     RemoveEqCamp,
     RemoveEqArea,
     RemoveEqCity,
     RemoveEqCountry,
     RemoveEqContact,
     RemoveEqHeadOffice,
     RemoveStaffEqHeadOffice,
     RemoveEqProvince,
     RemoveEqRegion,
     RemoveEqUsers,
     UpdateEnquiry,
     UpdateEqArea,
     UpdateEqCamp,
     UpdateEqCampContact,
     UpdateEqCity,
     UpdateEqCountry,
     UpdateEqHeadOffice,
     UpdateStaffEqHeadOffice,
     UpdateEqProvince,
     UpdateEqRegion
    } from "./function"


//Get Countries
export const useGetEqCountries = () => {
    return useMutation({
        mutationFn: () => GetEqCountries(),
    })
};

//Get Countries filtered
export const useGetEqCountriesFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["countries", queryParams],
        queryFn: () => GetEqCountriesFiltered(queryParams),
    })
}

//Add New Country
export const useAddNewEqCountry = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqCountry(payload),
    })
}

//Update Country
export const useUpdateEqCountry = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEqCountry(payload),
    })
}

//Get Country Profile
export const useGetEqCountryProfile = (country_id: string) => {
    return useQuery({
        queryKey: ["country", country_id],
        queryFn: () => GetEqCountryProfile(country_id),
        enabled: !!country_id,
    })
}

//Remove Country
export const useRemoveEqCountry = () => {
    return useMutation({
        mutationFn: (country_id: string) => RemoveEqCountry(country_id),
    })
}

//Get regions
export const useGetEqRegions = (country_id: string) => {
    return useQuery({
        queryKey: ["regions", country_id],
        queryFn: () => GetEqRegionsByCountry(country_id),
        enabled: !!country_id,
    })
}

//Get regions filtered
export const useGetEqRegionsFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["regions", queryParams],
        queryFn: () => GetEqRegionsFiltered(queryParams),
    })
}

//Add New Region
export const useAddNewEqRegion = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqRegion(payload),
    })
}

//Update Region
export const useUpdateEqRegion = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEqRegion(payload),
    })
}

//Get Region Profile
export const useGetEqRegionProfile = (region_id: string) => {
    return useQuery({
        queryKey: ["region", region_id],
        queryFn: () => GetEqRegionProfile(region_id),
        enabled: !!region_id,
    })
}

//Remove Region
export const useRemoveEqRegion = () => {
    return useMutation({
        mutationFn: (region_id: string) => RemoveEqRegion(region_id),
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

//Get Provinces filtered
export const useGetEqProvincesFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["provinces", queryParams],
        queryFn: () => GetEqProvincesFiltered(queryParams),
    })
}

//Add New Province
export const useAddNewEqProvince = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqProvince(payload),
    })
}

//Update Province
export const useUpdateEqProvince = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEqProvince(payload),
    })
}

//Get Province Profile
export const useGetEqProvinceProfile = (province_id: string) => {
    return useQuery({
        queryKey: ["province", province_id],
        queryFn: () => GetEqProvinceProfile(province_id),
        enabled: !!province_id,
    })
}

//Remove Province
export const useRemoveEqProvince = () => {
    return useMutation({
        mutationFn: (province_id: string) => RemoveEqProvince(province_id),
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

//Get Head Offices filtered
export const useGetEqHeadOfficesFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["head-offices", queryParams],
        queryFn: () => GetEqHeadOfficesFiltered(queryParams),
    })
}

//Get Staff Head Offices filtered
export const useGetStaffEqHeadOfficesFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["staff-head-offices", queryParams],
        queryFn: () => GetStaffEqHeadOfficesFiltered(queryParams),
    })
}

//Add New Head Office
export const useAddNewEqHeadOffice = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqHeadOffice(payload),
    })
}

//Add New Head Office (Staff)
export const useAddNewStaffEqHeadOffice = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewStaffEqHeadOffice(payload),
    })
}

//Update Head Office
export const useUpdateEqHeadOffice = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEqHeadOffice(payload),
    })
}

//Update Head Office (Staff)
export const useUpdateStaffEqHeadOffice = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateStaffEqHeadOffice(payload),
    })
}

//Get Head Office Profile
export const useGetEqHeadOfficeProfile = (head_office_id: string) => {
    return useQuery({
        queryKey: ["head-office", head_office_id],
        queryFn: () => GetEqHeadOfficeProfile(head_office_id),
        enabled: !!head_office_id,
    })
}

//Get Staff Head Office Profile
export const useGetStaffEqHeadOfficeProfile = (head_office_id: string) => {
    return useQuery({
        queryKey: ["staff-head-office", head_office_id],
        queryFn: () => GetStaffEqHeadOfficeProfile(head_office_id),
        enabled: !!head_office_id,
    })
}

//Remove Head Office
export const useRemoveEqHeadOffice = () => {
    return useMutation({
        mutationFn: (head_office_id: string) => RemoveEqHeadOffice(head_office_id),
    })
}

//Remove Staff Head Office
export const useRemoveStaffEqHeadOffice = () => {
    return useMutation({
        mutationFn: (head_office_id: string) => RemoveStaffEqHeadOffice(head_office_id),
    })
}

//Get Cities filtered
export const useGetEqCitiesFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["cities", queryParams],
        queryFn: () => GetEqCitiesFiltered(queryParams),
    })
}

//Add New City
export const useAddNewEqCity = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewEqCity(payload),
    })
}

//Update City
export const useUpdateEqCity = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateEqCity(payload),
    })
}

//Get City Profile
export const useGetEqCityProfile = (city_id: string) => {
    return useQuery({
        queryKey: ["city", city_id],
        queryFn: () => GetEqCityProfile(city_id),
        enabled: !!city_id,
    })
}

//Remove City
export const useRemoveEqCity = () => {
    return useMutation({
        mutationFn: (city_id: string) => RemoveEqCity(city_id),
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
export const useGetEqAreasFiltered = (queryParams: Record<string, string | number | undefined>) => {
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
export const useGetEqCampsFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["camps", queryParams],
        queryFn: () => GetEqCampsFiltered(queryParams),
    })
}

//Get Camps filtered (Staff)
export const useGetStaffEqCampsFiltered = (queryParams: Record<string, string | number | undefined>) => {
    return useQuery({
        queryKey: ["staff-camps", queryParams],
        queryFn: () => GetStaffEqCampsFiltered(queryParams),
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

//Export Enquiries (selected or filtered)
export const useExportEnquiries = () => {
    return useMutation({
        mutationFn: (payload: any) => ExportEnquiries(payload),
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

//Remove Contact
export const useRemoveEqContact = () => {
    return useMutation({
        mutationFn: (contact_id: string) => RemoveEqContact(contact_id),
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

//Remove Area
export const useRemoveEqArea = () => {
    return useMutation({
        mutationFn: (area_id: string) => RemoveEqArea(area_id),
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
