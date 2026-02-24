import TodoBox from "@/components/staff/TodoBox";
import axios from "axios";

export async function getUserByEmail ( email: string ) {
    try {
        const res = await axios.get(`/api/users/get-user/email/${email}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getUserByUserId ( userid: string ) {
    try {
        const res = await axios.get(`/api/users/get-user/id/${userid}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getUserByUserIdWithMeta(payload: { user_id: string; roleLabel: string }) {
    try {
        const res = await axios.post(`/api/users/get-user/id-with-meta`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function sendEmailVerification ( email: string ) {
    try {
        const res = await axios.post(`/api/users/verification/send-mail`, { email });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function verifyUserOtp ( { email, otp }: { email: string, otp: string } ) {
    try {
        const res = await axios.post(`/api/users/verification/verify`, { email, otp });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function setupUserPassword ( { email, password }: { email: string, password: string } ) {
    try {
        const res = await axios.post(`/api/users/verification/setup-pass`, { email, password });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getUserRolesAndDomains ( userid: string ) {
    try {
        const res = await axios.get(`/api/users/get/roles/${userid}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getUserDomainByRole (userid: string, role: string) {
    try {
        const res = await axios.get(`/api/users/get/domain?userid=${userid}&role=${role}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getBusinessStaffs (
    business_id: string,
    filters?: {
        search?: string;
        region_id?: string;
        area_id?: string;
        location_id?: string;
        skill_id?: string;
    }
) {
    try {
        const params = new URLSearchParams({ business_id });
        if (filters?.search) {
            params.set("search", filters.search);
        }
        if (filters?.region_id && filters.region_id !== "all") {
            params.set("region_id", filters.region_id);
        }
        if (filters?.area_id && filters.area_id !== "all") {
            params.set("area_id", filters.area_id);
        }
        if (filters?.location_id && filters.location_id !== "all") {
            params.set("location_id", filters.location_id);
        }
        if (filters?.skill_id && filters.skill_id !== "all") {
            params.set("skill_id", filters.skill_id);
        }
        const res = await axios.get(`/api/users/business/allstaffs?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addBusinessStaff ( payload: any ) {
    try {
        const res = await axios.post(`/api/users/business/add-staff`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function getUserCompleteProfileFunc (userid: string) {
    try {
        const res = await axios.get(`/api/users/get/complete-profile?userid=${userid}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addUserRegionFunc (payload: any) {
    try {
        const res = await axios.post(`/api/users/region/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserRegionFunc (URegId: string) {
    try {
        const res = await axios.post(`/api/users/region/remove`, { URegId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addUserRoleFunc (payload: any) {
    try {
        const res = await axios.post(`/api/users/role/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserRoleFunc (URoleId: string) {
    try {
        const res = await axios.post(`/api/users/role/remove`, { URoleId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserRolePermanentFunc(URoleId: string) {
    try {
        const res = await axios.post(`/api/users/role/permanent-remove`, { URoleId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addUserAreaFunc (payload: any) {
    try {
        const res = await axios.post(`/api/users/area/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserAreaFunc (UAreaId: string) {
    try {
        const res = await axios.post(`/api/users/area/remove`, { UAreaId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addUserLocationFunc (payload: any) {
    try {
        const res = await axios.post(`/api/users/location/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserLocationFunc (ULocId: string) {
    try {
        const res = await axios.post(`/api/users/location/remove`, { ULocId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addUserSkillFunc (payload: any) {
    try {
        const res = await axios.post(`/api/users/skill/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserSkillFunc (USkillId: string) {
    try {
        const res = await axios.post(`/api/users/skill/remove`, { USkillId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addUserDocFunc (payload: any) {
    try {
        const res = await axios.post(`/api/users/docs/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeUserDocFunc (UDocId: string) {
    try {
        const res = await axios.post(`/api/users/docs/remove`, { UDocId });
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function removeDepartmentAssignmentPermanentFunc(payload: { assignmentId: string; assignmentModel: string }) {
    try {
        const res = await axios.post(`/api/users/department/permanent-remove`, payload);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

//Get full profile for staffs
export async function GetFullStaffProfile (role_id: string, org_id: string){
    try{
        const res = await axios.get(`/api/users/get/staff/get-profile?role_id=${role_id}&org_id=${org_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Update Staff Profile
export async function UpdateStaffProfile(paylaod:any){
    try{
        const res = await axios.put("/api/users/update/staff-profile", paylaod);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Admin Profile
export async function GetAdminProfile(business_id:string){
    try{
        const res = await axios.get(`/api/users/get/admin/profile?business_id=${business_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get All User Todos
export async function GetAllUserTodos(){
    try{
        const res = await axios.get("/api/todo/get-all");
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add New UserTodo
export async function PostTodo(payload:any){
    try{
        const res = await axios.post("/api/todo/add", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Check UserTodo
export async function CheckTodo(payload: any){
    try{
        const res = await axios.put("/api/todo/check", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Delete User Todo
export async function DeleteTodo(todo_id: string){
    try{
        const res = await axios.delete(`/api/todo/delete?todo_id=${todo_id}`);
        return res.data;
    }catch(errr){
        console.log(errr);
    }
}

//Add New Agent
export async function AddNewAgent(payload: any){
    try{
        const res = await axios.post("/api/enquiries/agents/add", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function updateUserData ( payload: any ) {
    try {
       const res = await axios.post("/api/users/update", payload);
       return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function updateStaffStatus(payload: { staffid: string; status: "active" | "blocked" }) {
    try {
        const res = await axios.post("/api/staff/status", payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function deleteBusinessStaff(payload: { staff_id: string; business_id: string }) {
    try {
        const res = await axios.delete(`/api/staff/delete?staff_id=${payload.staff_id}&business_id=${payload.business_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}
