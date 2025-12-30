import axios from 'axios';

export const addNewBusinessFunc = async (payload: any) => {
    try {
        const res = await axios.post('/api/business/add-business', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessDetailsFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/add-business/details', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export const getAllBusinessFunc = async () => {
    try {
        const res = await axios.get('/api/business/get-all');
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export const getBusinessByIdFunc = async (id: string) => {
    try {
        const res = await axios.get(`/api/business/get-id/${id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessAdminFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/admin/add', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function editBusinessAdminFunc (payload: any) {
    try {
        const res = await axios.post(`/api/business/admin/edit`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessAdminFunc (payload: any) {
    try {
        const res = await axios.post(`/api/business/admin/delete`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getBusinessRegionsFunc (business_id: string) {
    try {
        const res = await axios.get(`/api/business/regions/getall?business_id=${business_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessRegionFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/regions/add', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessRegionFunc (BRid: string) {
    try {
        const res = await axios.post(`/api/business/regions/remove`, { BRid });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addRegionAreaFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/regions/add/area', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getRegionAreasFunc (region_ids: string[]) {
    try {
        const res = await axios.get(`/api/business/regions/get/areas?region_ids=${region_ids.join(",")}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getAreaLocationsFunc (area_ids: string[]) {
    try {
        const res = await axios.get(`/api/business/regions/get/locations?area_ids=${area_ids.join(",")}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeRegionAreaFunc (BAid: string) {
    try {
        const res = await axios.post(`/api/business/regions/remove/area`, { BAid });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addRegionHeadFunc ( payload: any ) {
    try {
        const res = await axios.post('/api/business/regions/add/head', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeRegionHeadFunc (RHid: string) {
    try {
        const res = await axios.post(`/api/business/regions/remove/head`, { RHid });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getRegionHeadsFunc ( region_ids: string[] ) {
    try {
        const res = await axios.get(`/api/business/regions/get/heads?region_ids=${region_ids.join(",")}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getRegionUsersFunc (region_ids: string[]) {
    try {
        const res = await axios.get(`/api/business/regions/get/users?region_ids=${region_ids.join(",")}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessSkillFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/skills/add', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getBusinessSkillsFunc (business_id: string) {
    try {
        const res = await axios.get(`/api/business/skills/getall?business_id=${business_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessSkillFunc (BSkillId: string) {
    try {
        const res = await axios.post(`/api/business/skills/remove`, { BSkillId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessDepartmentFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/departments/add', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getBusinessDepartmentsFunc (business_id: string) {
    try {
        const res = await axios.get(`/api/business/departments/getall?business_id=${business_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getBusinessDepartmentsByBusiness_idFunc (business_id: string) {
    try{
        const res = await axios.get(`/api/business/departments/getall/by-business_id?business_id=${business_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function editBusinessDepFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/departments/edit', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}
    
export async function removeBusinessDepartmentFunc (BDepId: string) {
    try {
        const res = await axios.post(`/api/business/departments/remove`, { BDepId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getCompleteDepartmentDataFunc (department_id: string) {
    try {
        const res = await axios.get(`/api/business/departments/get-complete?dep_id=${department_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addDepartmenHeadFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/departments/add/head', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeDepartmentHeadFunc (DepHeadId: string) {
    try {
        const res = await axios.post(`/api/business/departments/remove/head`, { DepHeadId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addDepartmentRegionFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/departments/add/region', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeDepartmentRegionFunc (DepRegionId: string) {
    try {
        const res = await axios.post(`/api/business/departments/remove/region`, { DepRegionId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addDepartmentAreaFunc ( payload: any ) {
    try {
        const res = await axios.post('/api/business/departments/add/area', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeDepartmentAreaFunc (DepAreaId: string) {
    try {
        const res = await axios.post(`/api/business/departments/remove/area`, { DepAreaId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addDepartmentStaffFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/departments/add/staff', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeDepartmentStaffFunc (DepStaffId: string) {
    try {
        const res = await axios.post(`/api/business/departments/remove/staff`, { DepStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getRegionCompleteFunc (region_id: string) {
    try {
        const res = await axios.get(`/api/business/regions/get-complete?region_id=${region_id}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addRegionDepartmentFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/regions/add/department', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeRegionDepartmentFunc (RegDepId: string) {
    try {
        const res = await axios.post(`/api/business/regions/remove/department`, { RegDepId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addRegionStaffFunc (payload: any) {
    try {
        const res = await axios.post('/api/business/regions/add/staff', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeRegionStaffFunc (RegStaffId: string) {
    try {
        const res = await axios.post(`/api/business/regions/remove/staff`, { RegStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

// Business Clients

export async function getBusinessClientsFunc (business_id: string) {
    try {
        const res = await axios.get(`/api/business/clients/getall?business_id=${business_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getBusinessClientCompleteDataByIdFunc ( client_id: string ) {
    try {
        const res = await axios.get(`/api/business/clients/get-complete?client_id=${client_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessClientFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/clients/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessClientFunc ( BClientId: string ) {
    try {
        const res = await axios.post(`/api/business/clients/remove`, { BClientId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessClientRegionFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/clients/add/region`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function updateBusinessClientFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/clients/update`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessClientRegionFunc ( BCRegId: string ) {
    try {
        const res = await axios.post(`/api/business/clients/remove/region`, { BCRegId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessClientAreaFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/clients/add/area`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessClientAreaFunc ( BCAreaId: string ) {
    try {
        const res = await axios.post(`/api/business/clients/remove/area`, { BCAreaId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addBusinessClientContactFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/clients/add/contact`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function updateBusinessClientContactFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/clients/update/contact`, payload)
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessClientContactFunc ( BCContactId: string ) {
    try {
        const res = await axios.post(`/api/business/clients/remove/contact`, { BCContactId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

// # Region Departments

export async function getRegionDepartmentCompleteDataFunc (reg_dep_id: string) {
    try {
        const res = await axios.get(`/api/business/region-dep/get-complete?region_dep_id=${reg_dep_id}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addRegionDepartmentHeadFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/region-dep/add/head`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addRegionDepartmentStaffFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/region-dep/add/staff`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeRegionDepartmentStaffFunc ( RegDepStaffId: string ) {
    try {
        const res = await axios.post(`/api/business/region-dep/remove/staff`, { RegDepStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

// Business Areas

export async function addAreaHeadFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/area/add/head`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}  

export async function removeAreaHeads ( AreaHId: string ) {
    try {
        const res = await axios.post(`/api/business/area/remove/head`, { AreaHId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addAreaStaffFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/area/add/staff`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeAreaStaff ( AreaStaffId: string ) {
    try {
        const res = await axios.post(`/api/business/area/remove/staff`, { AreaStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getAreaCompleteDataFunc (area_id: string) {
    try {
        const res = await axios.get(`/api/business/area/get-complete?area_id=${area_id}`);
        return res.data;
    } catch (error) {
        console.log(error)
    }
}

export async function addAreaDepartmentFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/area/add/department`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeAreaDepartmentFunc ( AreaDepId: string ) {
    try {
        const res = await axios.post(`/api/business/area/remove/department`, { AreaDepId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getAreaUsersFunc (area_ids: string[]) {
    try {
        const res = await axios.get(`/api/business/area/get-users?area_ids=${area_ids}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

// Business Locations

export async function addBusinessLocationFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/locations/add`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeBusinessLocationFunc ( LocId: string ) {
    try {
        const res = await axios.post(`/api/business/locations/remove`, { LocId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addLoctionHeadFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/locations/add/head`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeLocationHeadFunc ( LocHeadId: string ) {
    try {
        const res = await axios.post(`/api/business/locations/remove/head`, { LocHeadId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addLocationDepartmentFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/locations/add/department`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeLocationDepartmentFunc ( LocDepId: string ) {
    try {
        const res = await axios.post(`/api/business/locations/remove/department`, { LocDepId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getLocationCompleteDataFunc (loc_id: string) {
    try {
        const res = await axios.get(`/api/business/locations/get-complete?loc_id=${loc_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getLocationUsersFunc (loc_id: string) {
    try {
        const res = await axios.get(`/api/business/locations/get/users?loc_id=${loc_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addLoctionStaffFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/locations/add/staff`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeLocationStaffFunc ( LocStaffId: string ) {
    try {
        const res = await axios.post(`/api/business/locations/remove/staff`, { LocStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

// Area Departments

export async function getAreaDepartmentCompleteDataFunc (area_dep_id: string) {
    try {
        const res = await axios.get(`/api/business/area-dep/get-complete?area_dep_id=${area_dep_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addAreaDepartmentHeadFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/area-dep/add/head`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeAreaDepartmentHeadFunc ( AreaDepHeadId: string ) {
    try {
        const res = await axios.post(`/api/business/area-dep/remove/head`, { AreaDepHeadId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addAreaDepartmentStaffFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/area-dep/add/staff`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeAreaDepartmentStaffFunc ( AreaDepStaffId: string ) {
    try {
        const res = await axios.post(`/api/business/area-dep/remove/staff`, { AreaDepStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

// Location Departments

export async function getLocationDepartmentCompleteDataFunc (location_dep_id: string) {
    try {
        const res = await axios.get(`/api/business/location-dep/get-complete?location_dep_id=${location_dep_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addLocationDepartmentHeadFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/location-dep/add/head`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeLocationDepartmentHeadFunc ( LocationDepHeadId: string ) {
    try {
        const res = await axios.post(`/api/business/location-dep/remove/head`, { LocationDepHeadId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function addLocationDepartmentStaffFunc ( payload: any ) {
    try {
        const res = await axios.post(`/api/business/location-dep/add/staff`, payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function removeLocationDepartmentStaffFunc ( LocationDepStaffId: string ) {
    try {
        const res = await axios.post(`/api/business/location-dep/remove/staff`, { LocationDepStaffId });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function postNewProjectFunc ( payload: any ) {
    try {
        const res = await axios.post('/api/project/add-project', payload);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getProjectsFunc ( queryParams: any ) {
    try {
        const queryString = new URLSearchParams(queryParams).toString();
        const res = await axios.get(`/api/project/get-projects?${queryString}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
}

export async function getProjectByIdFunc ( project_id: string ) {
    try{
        if (!project_id) return null;
        const res = await axios.get(`/api/project/get-id/${project_id}`);
        return res.data;
    } catch (error) {
        console.log(error);
        return null;
    }
}

export async function UpdateProjectFunc(payload:any){
    try{
        const res = await axios.put('/api/project/update-project', payload);
        return res;
    }catch(err){
        console.log(err);
    }
}

export async function ApproveProjectFunc(project_id:string){
    try{
        const res = await axios.put(`/api/project/approve-project?project_id=${project_id}`);
        return res;
    }catch(err){
        console.log(err);
    }
}

export async function deleteProjectFunc(project_id: string) {
    try {
        const res = await axios.delete(`/api/project/delete?project_id=${project_id}`);
        return res.data;
    } catch (err) {
        console.log(err);
    }
}

export async function addNewTeamFunc (payload:any){
    try{
        const res = await axios.post('/api/project/teams/add-team', payload);
        return res;
    } catch (error) {
        console.log(error);
    }
}

export async function getTeamByProject(business_id:string, project_id?:string){
    try{
        const res = await axios.get(`/api/project/teams/get-all-byproj`, {
            params: {
                business_id,
                project_id
            }
        })
        return res.data;
    } catch(err){
        console.log(err);
        
    }
}

export async function updateTeamByProject(payload:any){
    try{
        const res = await axios.put(`/api/project/teams/edit-team`, payload);
        return res.data;
    } catch(err){
        console.log(err);
        
    }
}

export async function DeleteProjectTeam(team_id:string){
    try{
        const res = await axios.delete(`/api/project/teams/remove-team?team_id=${team_id}`)
        return res.data;
    }catch(err:any){
        throw err.response?.data || err;
    }
}

export async function GetTeamsForProjectsFunc(project_id:string){
    try{
        const res = await axios.get(`/api/project/teams/get-by-project?project_id=${project_id}`)
        return res.data;
    }catch(err){
        console.log(err);
        
    }
}

export async function AddProjectDepartmentFunc(payload:any){
    try{
        const res = await axios.post('/api/project/dept/add', payload);
        return res.data;
    }catch(err){
        console.log(err);
        
    }
}

export async function SelectProjectActiveDeptFunc(proj_dept_id:string){
    try{
        const res = await axios.put(`/api/project/dept/select-active`, {proj_dept_id: proj_dept_id});
        return res.data;
    } catch(err){
        console.log(err);
    }
}

export async function GetAddedProjectDepartmentsFunc(project_id:string){
    try{
        const res = await axios.get(`/api/project/dept/get?project_id=${project_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function RemoveAddedProjectDepartmentFunc(proj_dept_id:string){
    try{
        const res = await axios.delete(`/api/project/dept/delete?proj_dept_id=${proj_dept_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Add-Task
export async function AddBusinessTaskFunc(payload:any){
    try{
        const res = await axios.post("/api/task/project-task/add-task", payload);
        return res;
    }catch(err){
        console.log(err);
    }
}

export async function GetBusinessTasks(project_id:string){
    try{
        const res = await axios.get(`/api/task/project-task/get-tasks?project_id=${project_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function UpdateBusinessTaskFunc(payload:any){
    try{
        const res = await axios.put('/api/task/project-task/edit-task', payload);
        return res;
    }catch(err){
        console.log(err);
    }
}

export async function GetTaskByIdFunc(taskid:string){
    try{
        const res = await axios.get(`/api/task/getid/${taskid}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function GetAllTasks(searchParams:any){
    try{
        const queryString = new URLSearchParams(searchParams).toString();
        const res = await axios.get(`/api/task/all-tasks/get-all-tasks?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function AddTaskActivityFunc(payload:any){
    try{
        const res = await axios.post('/api/task/project-task/add-activity', payload);
        return res;
    }catch(err){
        console.log(err);
    }
}

export async function UpdateTaskActivityFunc(payload:any){
    try{
        const res = await axios.put('/api/task/project-task/edit-activity', payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function DeleteTaskActivityFunc(activity_id:string){
    try{
        const res = await axios.delete(`/api/task/project-task/delete-activity?activity_id=${activity_id}`);
        return res;
    }catch(err){
        console.log(err);
    }
}

//Flows
export async function GetFlowsByProjectFunc(project_id:string){
    try{
        const res = await axios.get(`/api/project/get-flows/${project_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function GetBusinessStaffsWithSkills(business_id:string){
    try{
        const res = await axios.get(`/api/staff/get-all-with-skill?business_id=${business_id}`)
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function GetStaffsByDepartment(department_id:string){
    try{
        const res = await axios.get(`/api/staff/department/get-by-dept?department_id=${department_id}`);
        return res.data;
    } catch(err){
        console.log(err);
    }
}

export async function GetUserDetails(role_id:string, org_id:string){
    try{
        const res = await axios.get(`/api/users/get-user/all-details?role_id=${role_id}&org_id=${org_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Staff-Tasks
export async function GetStaffTasksByFilter(queryParams: any) {
    try{
        const queryString = new URLSearchParams(queryParams).toString();
        const res = await axios.get(`/api/task/staff-task/get-filtered?${queryString}`);
        return res.data;
    }catch(err) {
        console.log(err);
    }
}

//Staff Projects
export async function GetStaffProjects(queryParams: any) {
    try{
        const queryString = new URLSearchParams(queryParams).toString();
        const res = await axios.get(`/api/project/staff/project/filtered?${queryString}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Business Data for Staff
export async function GetBusinessForStaff(domain_id: string){
    try{
        const res = await axios.get(`/api/business/staff/get-business?domain_id=${domain_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get All Staffs in StaffView
export async function GetAllStaffsForStaff(role_id:string){
    try{
        const res = await axios.get(`/api/staff/get-for-heads?role_id=${role_id}`, {
            withCredentials:true,
        });
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Single Staff
export async function GetSingleStaffbyId(user_id:string, role_id:string){
    try{
        const res = await axios.get(`/api/staff/get-staff/by-id?user_id=${user_id}&role_id=${role_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Departments for staff Heads.
export async function GetDepartmentsforHeads(role_id:string){
    try{
        const res = await axios.get(`/api/department/get-for-heads?role_id=${role_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Areas for staff Heads.
export async function GetAreasForHeads(){
    try{
        const res = await axios.get("/api/area/get-for-heads");
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Areas and Departments under region
export async function GetAreasandDeptsUnderRegion(region_id:string){
    try{
        const res = await axios.get(`/api/staff/heads/get-areas?region_id=${region_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Locations and Departments for Area
export async function GetLocationsandDeptsUnderArea(area_id:string){
    try{
        const res = await axios.get(`/api/staff/heads/get-locations?area_id=${area_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Departments for Locationm
export async function GetDepartmentsforLocations(location_id:string){
    try{
        const res = await axios.get(`/api/staff/heads/get-location-depts?location_id=${location_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Projects by id for staffs
export async function GetProjectByIdForStaffs(project_id:string){
    try{
        const res = await axios.get(`/api/project/get-id/for-staff?project_id=${project_id}`)
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function AddNewProjectByStaff(payload:any){
    try{
        const res = await axios.post("/api/project/add-project/by-staff", payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Get Departments for Staffs
export async function GetDepartmentsForStaffs(role_id:string, org_id:string){
    try{
        const res = await axios.get(`/api/department/get-all-subs?role_id=${role_id}&org_id=${org_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

//Remove Reg Department Head
export async function RemoveRegionDepartmentHead(head_id: string) {
    try{
        const res = await axios.delete(`/api/business/regions/remove/department/head?head_id=${head_id}`);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function addProjectDocFunc(payload:any){
    try{
        const res = await axios.post('/api/project/docs/add', payload);
        return res.data;
    }catch(err){
        console.log(err);
    }
}

export async function removeProjectDocFunc(doc_id:string){
    try{
        const res = await axios.post('/api/project/docs/remove', { doc_id });
        return res.data;
    }catch(err){
        console.log(err);
    }
}
