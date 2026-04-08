import axios from "axios";

//Get Countries
export async function GetEqCountries(){
    try{
        const res = await axios.get("/api/enquiries/agent-side/get/get-countries");
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Countries filtered
export async function GetEqCountriesFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/countries/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Regions
export async function GetEqRegionsByCountry(country_id: string){
    try{
        const res = await axios.get(`/api/enquiries/agent-side/get/get-regions-by-country?country_id=${country_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Regions filtered
export async function GetEqRegionsFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/regions/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Provinces
export async function GetEqProvincesByRegion(region_id: string){
    try{
        const res = await axios.get(`/api/enquiries/agent-side/get/get-province-by-region?region_id=${region_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Provinces filtered
export async function GetEqProvincesFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/provinces/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Cities
export async function GetEqCitiesByProvince(province_id: string){
    try{
        const res = await axios.get(`/api/enquiries/agent-side/get/get-city-by-province?province_id=${province_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Head Offices filtered
export async function GetEqHeadOfficesFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/head-offices/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Staff Head Offices filtered
export async function GetStaffEqHeadOfficesFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/staff-side/get/head-offices/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Cities filtered
export async function GetEqCitiesFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/cities/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Areas
export async function GetEqAreasByCity(city_id: string){
    try{
        const res = await axios.get(`/api/enquiries/agent-side/get/get-area-by-city?city_id=${city_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Camps by area
export async function GetEqCampsByArea(area_id: string){
    try{
        const res = await axios.get(`/api/enquiries/agent-side/get/get-camp-by-area?area_id=${area_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Areas Filtered
export async function GetEqAreasFiltered(queryParams: any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/area/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add New Country
export async function AddNewEqCountry(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-country", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add New Region
export async function AddNewEqRegion(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-region", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add New Province
export async function AddNewEqProvince(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-province", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add New City
export async function AddNewEqCity(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-city", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add New Head Office
export async function AddNewEqHeadOffice(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-head-office", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add New Head Office (Staff)
export async function AddNewStaffEqHeadOffice(payload: any){
    try{
        const res = await axios.post("/api/enquiries/staff-side/post/add-head-office", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add New Area
export async function AddNewEqArea(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-area", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Camps filtered
export async function GetEqCampsFiltered(queryParams:any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/camps/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Camps for map
export async function GetEqCampsForMap(queryParams:any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/get/camps/map?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
        return { camps: [], summary: { total: 0, visited: 0, toVisit: 0, awarded: 0, cancelled: 0, justAdded: 0 }, status: 500 };
    }
}

//Get custom map pins
export async function GetEqCustomMapPins(){
    try{
        const res = await axios.get("/api/enquiries/custom-pins");
        return res.data;
    }catch(err){
        console.log(err);
        return { pins: [], status: 500 };
    }
}

//Add custom map pin
export async function AddEqCustomMapPin(payload: any){
    try{
        const res = await axios.post("/api/enquiries/custom-pins", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update custom map pin
export async function UpdateEqCustomMapPin(payload: any){
    try{
        const res = await axios.put("/api/enquiries/custom-pins", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete custom map pin
export async function DeleteEqCustomMapPin(id: string){
    try{
        const res = await axios.delete(`/api/enquiries/custom-pins?id=${id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Get Camps filtered (Staff - created by current user)
export async function GetStaffEqCampsFiltered(queryParams:any){
    try{
        const safeParams: Record<string, string> = {};

        for (const key in queryParams) {
            const rawValue = queryParams[key];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            if (value !== "" && value !== null && value !== undefined) {
                safeParams[key] = String(value);
            }
        }

        const queryString = new URLSearchParams(safeParams).toString();
        const res = await axios.get(`/api/enquiries/staff-side/get/camps/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add new camp
export async function AddNewEqCamp(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/add-camp", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add new enquiry
export async function AddNewEnquiry(payload: any){
    try{
        const res = await axios.post("/api/enquiries/agent-side/post/add-new-enquiry", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Get enquiries by agent
export async function GetAgentEnquiries(){
    try{
        const res = await axios.get("/api/enquiries/agent-side/get/get-enquiries-by-agent");
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get agents for admin
export async function GetAgentsByBusiness(business_id: string, search: string){
    try{
        const res = await axios.get(`/api/enquiries/agents/get/get-agents-by-business?business_id=${business_id}&search=${search}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Enquiries with filters
export async function GetEnquiriesWithFilters(queryParams: any) {
  try {
    const safeParams: any = {};

    // Only include keys that have a value
    for (const key in queryParams) {
      const val = queryParams[key];

      if (val !== "" && val !== null && val !== undefined) {
        safeParams[key] = val; // keep only real filters
      }
    }

    const queryString = new URLSearchParams(safeParams).toString();

    const res = await axios.get(
      `/api/enquiries/get/enquiries/filtered?${queryString}`
    );

    return res.data || { data: [] };
  } catch (err) {
    console.log(err);
    return { data: [], status: 500 };
  }
}

//Export Enquiries (selected or filtered)
export async function ExportEnquiries(payload: any) {
  try {
    const res = await axios.post("/api/enquiries/get/enquiries/export", payload);
    return res.data;
  } catch (err) {
    console.log(err);
    return (err as any)?.response?.data;
  }
}

//Get Enquiry by iD
export async function GetEnquiryById(enquiry_id:string){
    try{
        const res = await axios.get(`/api/enquiries/get/enquiries/by-id?enquiry_id=${enquiry_id}`);
        return res?.data ?? { status: 500, message: "Failed to fetch enquiry" };
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data ?? { status: 500, message: "Failed to fetch enquiry" };
    }
}

//Add History
export async function ForwardHistory(payload: any) {
    try{
        const res = await axios.post("/api/enquiries/post/forward-history", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Enquiry Users
export async function GetEqUsers (business_id: string, user_type: string) {
    try{
        const res = await axios.get(`/api/enquiries/users/get?business_id=${business_id}&user_type=${user_type}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add Enquiry Users
export async function AddEqUser(payload: any){
    try{
        const res = await axios.post("/api/enquiries/users/add", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get All Enquiry histories
export async function GetEnquiryHistories(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/enquiries/history/get-all?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Enquiry Comments
export async function GetEnquiryComments(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/comments/get?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Add Enquiry Comment
export async function AddEnquiryComment(payload: any){
    try{
        const res = await axios.post(`/api/enquiries/comments/add`, payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update Enquiry Comment
export async function UpdateEnquiryComment(payload: any){
    try{
        const res = await axios.put(`/api/enquiries/comments/update`, payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete Enquiry Comment
export async function DeleteEnquiryComment(comment_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/comments/delete?comment_id=${comment_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Get Enquiry History by ID
export async function GetEnquiryHistoryById(history_id: string) {
    try{
        const res = await axios.get(`/api/enquiries/get/enquiries/history/by-id?history_id=${history_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Access Enquries for Staffs
export async function GetAccessEnquiriesForStaffs(queryParams: any) {
    try{
        const queryString = new URLSearchParams(queryParams).toString();
        const res = await axios.get(`/api/enquiries/staff-side/get/user-enquiries?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Enquiry By ID for staff
export async function GetEnquiryByIdForStaffs(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/staff-side/get/enquiry-by-id?enquiry_id=${enquiry_id}`);
        return res?.data ?? { status: 500, message: "Failed to fetch enquiry" };
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data ?? { status: 500, message: "Failed to fetch enquiry" };
    }
}

//Get Enquiry all history for staff
export async function GetAllEnquiryHistoryForStaffs(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/staff-side/get/history/get-all?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get User Assigned Enquiries with Filters
export async function GetUserAssignedEnquiries(queryParams: any){
    try{
        const queryString = new URLSearchParams(queryParams).toString();
        const res = await axios.get(`/api/enquiries/staff-side/get/user-assigned-enquiry?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Update Country
export async function UpdateEqCountry(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/country", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update Region
export async function UpdateEqRegion(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/region", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update Province
export async function UpdateEqProvince(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/province", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update City
export async function UpdateEqCity(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/city", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update Head Office
export async function UpdateEqHeadOffice(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/head-office", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update Head Office (Staff)
export async function UpdateStaffEqHeadOffice(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/staff-side/update/head-office", payload);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Update / Activate Area
export async function UpdateEqArea(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/area", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Update Camp
export async function UpdateEqCamp(payload: any) {
    try{
        const res = await axios.put("/api/enquiries/update/camp", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Activate Camp
export async function ActivateEqCamp(payload:any){
    try{
        const res = await axios.put("/api/enquiries/update/activate-camp", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Update Enquiry (Admin)
export async function UpdateEnquiry(payload: any){
    try{
        const res = await axios.put("/api/enquiries/update/enquiry", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Area by ID
export async function GetEqAreaById(area_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/area/by-id?area_id=${area_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Agent by ID
export async function GetEqAgentByID(agent_id:string){
    try{
        const res = await axios.get(`/api/enquiries/get/agents/by-id?agent_id=${agent_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Forward Enquiry By User / Staff
export async function ForwardEnquiryByStaff(payload: any) {
    try{
        const res = await axios.post("/api/enquiries/staff-side/post/forward-enquiry", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Latest Action for staff
export async function GetEqLatestActionForStaff(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/staff-side/get/latest-action?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data ?? { status: 500, message: "Failed to fetch latest action" };
    }
}

//Get User profile
export async function GetEqUserProfile(user_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/users/user-profile?user_id=${user_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get User logs
export async function GetEqUserLogs(user_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/users/logs?user_id=${user_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Camps by Enquiry
export async function GetEqCampsByEnquiry(enquiry_id: string, is_new: boolean){
    try{
        const res = await axios.get(`/api/enquiries/get/camps/get-camp-by-enquiry?enquiry_id=${enquiry_id}&is_new=${is_new}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Assign camp to enquiry
export async function AssignEqCamptoEnquiry(payload: any){
    try{
        const res = await axios.put("/api/enquiries/update/assign-camp-to-enquiry", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get EQ camps by ID
export async function GetEqCampsById(camp_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/camps/by-id?camp_id=${camp_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Eq Country Profile
export async function GetEqCountryProfile(country_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/country/profile-by-id?country_id=${country_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Eq Region Profile
export async function GetEqRegionProfile(region_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/region/profile-by-id?region_id=${region_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Eq Province Profile
export async function GetEqProvinceProfile(province_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/province/profile-by-id?province_id=${province_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Eq City Profile
export async function GetEqCityProfile(city_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/city/profile-by-id?city_id=${city_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Eq Head Office Profile
export async function GetEqHeadOfficeProfile(head_office_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/head-office/profile-by-id?head_office_id=${head_office_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Eq Head Office Profile (Staff)
export async function GetStaffEqHeadOfficeProfile(head_office_id: string){
    try{
        const res = await axios.get(`/api/enquiries/staff-side/get/head-office/profile-by-id?head_office_id=${head_office_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Get Eq Area Profile
export async function GetEqAreaProfile(area_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/area/profile-by-id?area_id=${area_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Activate / Deactivate Eq Agents
export async function ActivateDeactivateEqAgents(agent_id: string){
    try{
        const res = await axios.put(`/api/enquiries/update/agents/activate-deactivate?user_id=${agent_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Update Eq Camp contact
export async function UpdateEqCampContact(payload: any){
    try{
        const res = await axios.put("/api/enquiries/update/camp/update-contact", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Enquiry Contacts
export async function GetEnquiryContacts(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/enquiries/contacts/get-all?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Enquiry Edit Request
export async function PutEnquiryEditReq(payload:any){
    try{
        const res = await axios.put("/api/enquiries/agent-side/update/enquiry", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Enquiry Edit
export async function GetEqEdit(enquiry_id: string){
    try{
        const res = await axios.get(`/api/enquiries/get/enquiries/edited?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Accept Enquiry Edit
export async function AcceptEnquiryEdits(payload: any){
    try{
        const res = await axios.put("/api/enquiries/update/enquiry/accept-edits", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add New Contacts
export async function AddNewCampContact (payload: any) {
    try{
        const res = await axios.post("/api/enquiries/post/contact", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add New Contact (Agent Side)
export async function AddNewContactAgent (payload: any) {
    try{
        const res = await axios.post("/api/enquiries/agent-side/post/contact", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete Contact
export async function RemoveEqContact(contact_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/contact?contact_id=${contact_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Convert Enquiry to Project
export async function EnquiryToProject(payload: any){
    try{
        const res = await axios.post("/api/enquiries/post/enquiry/convert-to-project", payload);
        return res.data;
    } catch(err){
        console.log(err);
    }
}

//Close Enquiry
export async function CloseEqnuiry(payload: any){
    try{
        const res = await axios.put("/api/enquiries/update/enquiry/close-enquiry", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete Camp
export async function RemoveEqCamp(camp_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/camp?camp_id=${camp_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete Country
export async function RemoveEqCountry(country_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/country?country_id=${country_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete Region
export async function RemoveEqRegion(region_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/region?region_id=${region_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete Province
export async function RemoveEqProvince(province_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/province?province_id=${province_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete City
export async function RemoveEqCity(city_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/city?city_id=${city_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete Head Office
export async function RemoveEqHeadOffice(head_office_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/head-office?head_office_id=${head_office_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete Head Office (Staff)
export async function RemoveStaffEqHeadOffice(head_office_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/staff-side/delete/head-office?head_office_id=${head_office_id}`);
        return res.data;
    }catch(err){
        console.log(err);
        return (err as any)?.response?.data;
    }
}

//Delete Area
export async function RemoveEqArea(area_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/area?area_id=${area_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete Enquiry User
export async function RemoveEqUsers(user_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/users?user_id=${user_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete Enquiry Agent
export async function RemoveEnquiryAgent(agent_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/agents/delete?agent_id=${agent_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete Enquiry
export async function RemoveEnquiry(enquiry_id: string){
    try{
        const res = await axios.delete(`/api/enquiries/delete/enquiry?enquiry_id=${enquiry_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}
