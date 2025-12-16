import { IBusiness_Project } from "@/models/business_project.model";
import { 
    addAreaDepartmentFunc,
    addAreaDepartmentHeadFunc,
    addAreaDepartmentStaffFunc,
    addAreaHeadFunc,
    addAreaStaffFunc,
    addBusinessAdminFunc, 
    addBusinessClientAreaFunc, 
    addBusinessClientContactFunc, 
    addBusinessClientFunc, 
    addBusinessClientRegionFunc, 
    addBusinessDepartmentFunc, 
    addBusinessDetailsFunc,
    addBusinessLocationFunc,
    addBusinessRegionFunc,
    addBusinessSkillFunc,
    AddBusinessTaskFunc,
    addDepartmenHeadFunc,
    addDepartmentAreaFunc,
    addDepartmentRegionFunc,
    addDepartmentStaffFunc,
    addLocationDepartmentFunc,
    addLoctionHeadFunc,
    addLoctionStaffFunc,
    addNewBusinessFunc,
    AddNewProjectByStaff,
    addNewTeamFunc,
    AddProjectDepartmentFunc,
    addRegionAreaFunc,
    addRegionDepartmentFunc,
    addRegionDepartmentHeadFunc,
    addRegionDepartmentStaffFunc,
    addRegionHeadFunc,
    addRegionStaffFunc,
    AddTaskActivityFunc,
    ApproveProjectFunc,
    DeleteProjectTeam,
    DeleteTaskActivityFunc,
    editBusinessAdminFunc,
    editBusinessDepFunc,
    GetAddedProjectDepartmentsFunc,
    getAllBusinessFunc,
    GetAllStaffsForStaff,
    GetAllTasks,
    getAreaCompleteDataFunc,
    getAreaDepartmentCompleteDataFunc,
    getAreaLocationsFunc,
    GetAreasandDeptsUnderRegion,
    GetAreasForHeads,
    getAreaUsersFunc,
    getBusinessByIdFunc,
    getBusinessClientCompleteDataByIdFunc,
    getBusinessClientsFunc,
    getBusinessDepartmentsByBusiness_idFunc,
    getBusinessDepartmentsFunc,
    GetBusinessForStaff,
    getBusinessRegionsFunc,
    getBusinessSkillsFunc,
    GetBusinessStaffsWithSkills,
    GetBusinessTasks,
    getCompleteDepartmentDataFunc,
    GetDepartmentsforHeads,
    GetDepartmentsforLocations,
    GetDepartmentsForStaffs,
    GetFlowsByProjectFunc,
    getLocationCompleteDataFunc,
    GetLocationsandDeptsUnderArea,
    getLocationUsersFunc,
    GetProjectByIdForStaffs,
    getProjectByIdFunc,
    getProjectsFunc,
    getRegionAreasFunc,
    getRegionCompleteFunc,
    getRegionDepartmentCompleteDataFunc,
    getRegionHeadsFunc,
    getRegionUsersFunc,
    GetSingleStaffbyId,
    GetStaffProjects,
    GetStaffsByDepartment,
    GetStaffTasksByFilter,
    GetTaskByIdFunc,
    getTeamByProject,
    GetTeamsForProjectsFunc,
    GetUserDetails,
    postNewProjectFunc,
    RemoveAddedProjectDepartmentFunc,
    removeAreaDepartmentFunc,
    removeAreaDepartmentHeadFunc,
    removeAreaDepartmentStaffFunc,
    removeAreaHeads,
    removeAreaStaff,
    removeBusinessAdminFunc,
    removeBusinessClientAreaFunc,
    removeBusinessClientContactFunc,
    removeBusinessClientFunc,
    removeBusinessClientRegionFunc,
    removeBusinessDepartmentFunc,
    removeBusinessLocationFunc,
    removeBusinessRegionFunc,
    removeBusinessSkillFunc,
    removeDepartmentAreaFunc,
    removeDepartmentHeadFunc,
    removeDepartmentRegionFunc,
    removeDepartmentStaffFunc,
    removeLocationDepartmentFunc,
    removeLocationHeadFunc,
    removeLocationStaffFunc,
    removeRegionAreaFunc,
    removeRegionDepartmentFunc,
    RemoveRegionDepartmentHead,
    removeRegionDepartmentStaffFunc,
    removeRegionHeadFunc,
    removeRegionStaffFunc,
    SelectProjectActiveDeptFunc,
    updateBusinessClientContactFunc,
    updateBusinessClientFunc,
    UpdateBusinessTaskFunc,
    UpdateProjectFunc,
    UpdateTaskActivityFunc,
    updateTeamByProject,
    addProjectDocFunc,
    removeProjectDocFunc
} from "./functions";
import { BUSINESS_KEYS } from "./keys";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAddNewBusiness = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => addNewBusinessFunc(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [BUSINESS_KEYS.GET_ALL_BUSINESS]
            })
        }
    })
}

export const useAddBusinessDetails = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => addBusinessDetailsFunc(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [BUSINESS_KEYS.GET_BUSINESS_BY_ID, data?._id]
            })
            queryClient.invalidateQueries({
                queryKey: [BUSINESS_KEYS.GET_ALL_BUSINESS]
            })
        }
    });
}

export const useGetAllBusinesses = () => {
    return useQuery({
        queryKey: [BUSINESS_KEYS.GET_ALL_BUSINESS],
        queryFn: () => getAllBusinessFunc()
    })
}

export const useGetBusinessById = (id: string) => {
    return useQuery({
        queryKey: [BUSINESS_KEYS.GET_BUSINESS_BY_ID, id],
        queryFn: () => getBusinessByIdFunc(id)
    })
}

export const useAddBusinessAdmin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => addBusinessAdminFunc(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [BUSINESS_KEYS.GET_BUSINESS_BY_ID, data?.business_id]
            })
        } 
    })
}

export const useEditBusinessAdmin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => editBusinessAdminFunc(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [BUSINESS_KEYS.GET_BUSINESS_BY_ID, data?.business_id]
            })
        }
    })
}

export const useRemoveBusinessAdmin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => removeBusinessAdminFunc(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [BUSINESS_KEYS.GET_BUSINESS_BY_ID, data?.business_id]
            })
        }
    })
}

export const useGetBusinessRegions = () => {
    return useMutation({
        mutationFn: ({ business_id }: { business_id: string }) => getBusinessRegionsFunc(business_id)
    })
}

export const useAddBusinessRegion = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessRegionFunc(payload)
    })
}

export const useRemoveBusinessRegion = () => {
    return useMutation({
        mutationFn: (BRid: string) => removeBusinessRegionFunc(BRid)
    })
}

export const useAddRegionArea = () => {
    return useMutation({
        mutationFn: (payload: any) => addRegionAreaFunc(payload)
    })
}

export const useGetRegionAreas = () => {
    return useMutation({
        mutationFn: ({ region_ids }: { region_ids: string[] }) => getRegionAreasFunc(region_ids)
    })
}

export const useGetAreaLocations = () => {
    return useMutation({
        mutationFn: ({ area_ids }: { area_ids: string[] }) => getAreaLocationsFunc(area_ids)
    })
}

export const useRemoveRegionArea = () => {
    return useMutation({
        mutationFn: (BAid: string) => removeRegionAreaFunc(BAid),
    })
}

export const useAddRegionHead = () => {
    return useMutation({
        mutationFn: (payload: any) => addRegionHeadFunc(payload)
    })
}

export const useRemoveRegionHead = () => {
    return useMutation({
        mutationFn: (RHid: string) => removeRegionHeadFunc(RHid)
    })
}

export const useGetRegionHeads = () => {
    return useMutation({
        mutationFn: (region_ids: string[]) => getRegionHeadsFunc(region_ids)
    })
}

export const useGetRegionUsers = () => {
    return useMutation({
        mutationFn: (region_ids: string[]) => getRegionUsersFunc(region_ids)
    })
}

export const useAddBusinessSkill = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessSkillFunc(payload)
    })
}

export const useGetBusinessSkills = () => {
    return useMutation({
        mutationFn: (business_id: string) => getBusinessSkillsFunc(business_id)
    })
}

export const useRemoveBusinessSkill = () => {
    return useMutation({
        mutationFn: (BSkillId: string) => removeBusinessSkillFunc(BSkillId)
    })
}

export const useAddBusinessDepartment = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessDepartmentFunc(payload)
    })
}

export const useGetBusinessDepartments = () => {
    return useMutation({
        mutationFn: (business_id: string) => getBusinessDepartmentsFunc(business_id)
    })
}

export const useGetBusinessDepartmentsByBusiness_id = (business_id: string) => {
    return useQuery({
        queryKey: ["departments", business_id],
        queryFn: () => getBusinessDepartmentsByBusiness_idFunc(business_id),
        enabled: !!business_id, // only fetch if business_id exists
    })
}

export const useEditBusinessDepartment = () => {
    return useMutation({
        mutationFn: (payload: any) => editBusinessDepFunc(payload)
    })
}

export const useRemoveBusinessDepartment = () => {
    return useMutation({
        mutationFn: (BDepId: string) => removeBusinessDepartmentFunc(BDepId)
    })
}

export const useGetCompleteDepartmentData = () => {
    return useMutation({
        mutationFn: (department_id: string) => getCompleteDepartmentDataFunc(department_id)
    })
}

export const useAddDepartmentHead = () => {
    return useMutation({
        mutationFn: (payload: any) => addDepartmenHeadFunc(payload)
    })
}

export const useRemoveDepartmentHead = () => {
    return useMutation({
        mutationFn: (DepHeadId: string) => removeDepartmentHeadFunc(DepHeadId)
    })
}

export const useAddDepartmentRegion = () => {
    return useMutation({
        mutationFn: (payload: any) => addDepartmentRegionFunc(payload)
    })
}

export const useRemoveDepartmentRegion = () => {
    return useMutation({
        mutationFn: (DepRegionId: string) => removeDepartmentRegionFunc(DepRegionId)
    })
}

export const useAddDepartmentArea = () => {
    return useMutation({
        mutationFn: (payload: any) => addDepartmentAreaFunc(payload)
    })
}

export const useRemoveDepartmentArea = () => {
    return useMutation({
        mutationFn: (DepAreaId: string) => removeDepartmentAreaFunc(DepAreaId)
    })
}

export const useAddDepartmentStaff = () => {
    return useMutation({
        mutationFn: (payload: any) => addDepartmentStaffFunc(payload)
    })
}

export const useRemoveDepartmentStaff = () => {
    return useMutation({
        mutationFn: (DepStaffId: string) => removeDepartmentStaffFunc(DepStaffId)
    })
}

export const useGetRegionComplete = () => {
    return useMutation({
        mutationFn: (region_id: string) => getRegionCompleteFunc(region_id)
    })
}

export const useAddRegionDepartment = () => {
    return useMutation({
        mutationFn: (payload: any) => addRegionDepartmentFunc(payload)
    })
}

export const useRemoveRegionDepartment = () => {
    return useMutation({
        mutationFn: (RegDepId: string) => removeRegionDepartmentFunc(RegDepId)
    })
}

export const useAddRegionStaff = () => {
    return useMutation({
        mutationFn: (payload: any) => addRegionStaffFunc(payload)
    })
}

export const useRemoveRegionStaff = () => {
    return useMutation({
        mutationFn: (RegStaffId: string) => removeRegionStaffFunc(RegStaffId)
    })
}

// Business Clients

export const useGetBusinessClients = () => {
    return useMutation({
        mutationFn: (business_id: string) => getBusinessClientsFunc(business_id)
    })
}

export const useGetBusinessClientCompleteDataById = () => {
    return useMutation({
        mutationFn: (client_id: string) => getBusinessClientCompleteDataByIdFunc(client_id)
    })
}

export const useAddBusinessClient = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessClientFunc(payload)
    })
}

export const useUpdateBusinessClient = () => {
    return useMutation({
        mutationFn: (payload: any) => updateBusinessClientFunc(payload)
    })
}

export const useRemoveBusinessClient = () => {
    return useMutation({
        mutationFn: (BClientId: string) => removeBusinessClientFunc(BClientId)
    })
}

export const useAddBusinessClientRegion = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessClientRegionFunc(payload)
    })
}

export const useRemoveBusinessClientRegion = () => {
    return useMutation({
        mutationFn: (BCRegId: string) => removeBusinessClientRegionFunc(BCRegId)
    })
}

export const useAddBusinessClientArea = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessClientAreaFunc(payload)
    })
}

export const useRemoveBusinessClientArea = () => {
    return useMutation({
        mutationFn: (BCAreaId: string) => removeBusinessClientAreaFunc(BCAreaId)
    })
}

export const useAddBusinessClientContact = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessClientContactFunc(payload)
    })
}

export const useUpdateBusinessClientContact = () => {
    return useMutation({
        mutationFn: (payload: any) => updateBusinessClientContactFunc(payload)
    })
}

export const useRemoveBusinessClientContact = () => {
    return useMutation({
        mutationFn: (BCContactId: string) => removeBusinessClientContactFunc(BCContactId)
    })
}

// Region Departments

export const useGetRegionDepartmentCompleteData = () => {
    return useMutation({
        mutationFn: (reg_dep_id: string) => getRegionDepartmentCompleteDataFunc(reg_dep_id)
    })
}

export const useAddRegionDepartmentHead = () => {
    return useMutation({
        mutationFn: (payload: any) => addRegionDepartmentHeadFunc(payload)
    })
}

export const useAddRegionDepartmentStaff = () => {
    return useMutation({
        mutationFn: (payload: any) => addRegionDepartmentStaffFunc(payload)
    })
}

export const useRemoveRegionDepartmentStaff = () => {
    return useMutation({
        mutationFn: (RegDepStaffId: string) => removeRegionDepartmentStaffFunc(RegDepStaffId)
    })
}

// Business Area
export const useAddAreaHead = () => {
    return useMutation({
        mutationFn: (payload: any) => addAreaHeadFunc(payload)
    })
}

export const useRemoveAreaHead = () => {
    return useMutation({
        mutationFn: (AreaHId: string) => removeAreaHeads(AreaHId)
    })
}

export const useAddAreaStaff = () => {
    return useMutation({
        mutationFn: (payload: any) => addAreaStaffFunc(payload)
    })
}

export const useRemoveAreaStaff = () => {
    return useMutation({
        mutationFn: (AreaStaffId: string) => removeAreaStaff(AreaStaffId)
    })
}

export const useGetAreaCompleteData = () => {
    return useMutation({
        mutationFn: (area_id: string) => getAreaCompleteDataFunc(area_id)
    })
}

export const useAddAreaDepartment = () => {
    return useMutation({
        mutationFn: (payload: any) => addAreaDepartmentFunc(payload)
    })
}

export const useRemoveAreaDepartment = () => {
    return useMutation({
        mutationFn: (AreaDepId: string) => removeAreaDepartmentFunc(AreaDepId)
    })
}

export const useGetAreaUsers = () => {
    return useMutation({
        mutationFn: (area_ids: string[]) => getAreaUsersFunc(area_ids)
    })
}

// Business Locations

export const useAddBusinessLocation = () => {
    return useMutation({
        mutationFn: (payload: any) => addBusinessLocationFunc(payload)
    })
}

export const useRemoveBusinessLocation = () => {
    return useMutation({
        mutationFn: (LocId: string) => removeBusinessLocationFunc(LocId)
    })
}

export const useAddLoctionHead = () => {
    return useMutation({
        mutationFn: (payload: any) => addLoctionHeadFunc(payload)
    })
}

export const useRemoveLocationHead = () => {
    return useMutation({
        mutationFn: (LocHeadId: string) => removeLocationHeadFunc(LocHeadId)
    })
}

export const useAddLocationDepartment = () => {
    return useMutation({
        mutationFn: (payload: any) => addLocationDepartmentFunc(payload)
    })
}

export const useRemoveLocationDepartment = () => {
    return useMutation({
        mutationFn: (LocDepId: string) => removeLocationDepartmentFunc(LocDepId)
    })
}

export const useGetLocationCompleteData = () => {
    return useMutation({
        mutationFn: (loc_id: string) => getLocationCompleteDataFunc(loc_id)
    })
}

export const useGetLocationUsers = () => {
    return useMutation({
        mutationFn: (loc_id: string) => getLocationUsersFunc(loc_id)
    })
}

export const useAddLocationStaff = () => {
    return useMutation({
        mutationFn: (payload: any) => addLoctionStaffFunc(payload)
    })
}

export const useRemoveLocationStaff = () => {
    return useMutation({
        mutationFn: (LocStaffId: string) => removeLocationStaffFunc(LocStaffId)
    })
}

// Area Departments

export const useGetAreaDepartmentCompleteData = () => {
    return useMutation({
        mutationFn: (area_dep_id: string) => getAreaDepartmentCompleteDataFunc(area_dep_id)
    })
}

export const useAddAreaDepartmentHead = () => {
    return useMutation({
        mutationFn: (payload: any) => addAreaDepartmentHeadFunc(payload)
    })
}

export const useRemoveAreaDepartmentHead = () => {
    return useMutation({
        mutationFn: (AreaDepHeadId: string) => removeAreaDepartmentHeadFunc(AreaDepHeadId)
    })
}

export const useAddAreaDepartmentStaff = () => {
    return useMutation({
        mutationFn: (payload: any) => addAreaDepartmentStaffFunc(payload)
    })
}

export const useRemoveAreaDepartmentStaff = () => {
    return useMutation({
        mutationFn: (AreaDepStaffId: string) => removeAreaDepartmentStaffFunc(AreaDepStaffId)
    })
}

//Business Project
export const useAddNewProject = () => {
    return useMutation({
        mutationFn: (newProj: any) => postNewProjectFunc(newProj)
    })
}

export const useGetProjects = (queryParams: Record<string, string | undefined>) => {
  return useQuery({
    queryKey: ["projects", queryParams], // cache depends on filters
    queryFn: () => getProjectsFunc(queryParams),
    enabled: !!queryParams.business_id, // optional: only fetch if business_id exists
  });
};

export const useGetProjectById = (project_id?: string) => {
  return useQuery({
    queryKey: ["project", project_id],
    queryFn: () => getProjectByIdFunc(project_id!),
    enabled: !!project_id, // only fetch if id exists
  });
};

export const useUpdateProject = () => {
    return useMutation({
        mutationFn: (payload:any) => UpdateProjectFunc(payload)
    })
};

export const useApproveProject = () => {
    return useMutation({
        mutationFn: (payload: any) => ApproveProjectFunc(payload)
    })
}

export const useAddProjectDoc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => addProjectDocFunc(payload),
        onSuccess: (data: any) => {
            if (data?.doc?.project_id) {
                const key = data?.doc?.project_id?.toString?.() || data?.doc?.project_id;
                queryClient.invalidateQueries({ queryKey: ["project", key] });
            }
        }
    })
}

export const useRemoveProjectDoc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (doc_id: string) => removeProjectDocFunc(doc_id),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["project"] });
        }
    })
}

export const useAddProjectDepartment = () => {
    return useMutation({
        mutationFn: (payload:any) => AddProjectDepartmentFunc(payload)
    })
}

export const useSelectActiveProjectDepartment = () => {
    return useMutation({
        mutationFn: (payload:any) => SelectProjectActiveDeptFunc(payload)
    })
}

export const useGetAddedProjectDepartments = (project_id?: string) => {
    return useQuery({
        queryKey: ["project_depts", project_id],
        queryFn: () => GetAddedProjectDepartmentsFunc(project_id!),
        enabled: !!project_id, // only fetch if id exists
    })
}

export const useRemoveAddedProjectDepartment = () => {
    return useMutation({
        mutationFn: (PDId: string) => RemoveAddedProjectDepartmentFunc(PDId)
    })
}

//Add New Team
export const useAddNewTeam = () => {
    return useMutation({
        mutationFn: (payload: any) => addNewTeamFunc(payload),
    })
}

//Get Teams
export const useGetTeamsByProject = (business_id: string, project_id?: string) => {
    return useQuery({
        queryKey: ["teams", business_id, project_id],
        queryFn: ()=> getTeamByProject(business_id!, project_id),
        enabled: !!business_id,
    })
}

//Update Teams
export const useUpdateTeam = () => {
    return useMutation({
        mutationFn: (payload:any) => updateTeamByProject(payload),
    })
}

//Remove Project Teams
export const useRemoveProjectTeams = () => {
    return useMutation({
        mutationFn: (payload:string) => DeleteProjectTeam(payload),
    })
}

export const useGetTeamsForProjects = (project_id:string) => {
    return useQuery({
        queryKey: ["teams_for_project", project_id],
        queryFn: ()=> GetTeamsForProjectsFunc(project_id),
        enabled: !!project_id
    })
}

//Add-Task
export const useAddBusinessTask = () => {
    return useMutation({
        mutationFn: (payload:any) => AddBusinessTaskFunc(payload)
    })
}

export const useGetBusinessTasks = (project_id:string)=>{
    return useQuery({
        queryKey: ["tasks", project_id],
        queryFn: ()=> GetBusinessTasks(project_id),
        enabled: !!project_id
    })
}

export const useUpdateBusinessTask = () => {
    return useMutation({
        mutationFn: (payload:any) => UpdateBusinessTaskFunc(payload)
    })
}

export const useGetTaskById = (taskid:string) => {
    return useQuery({
        queryKey: ["task", taskid],
        queryFn: ()=> GetTaskByIdFunc(taskid),
        enabled: !!taskid
    })
}

export const useGetAllTasks = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["tasks", queryParams],
        queryFn: () => GetAllTasks(queryParams),
        enabled: !!queryParams.business_id

    })
}

//Add Task-Activity
export const useAddTaskActivity = () => {
    return useMutation({
        mutationFn: (payload: any) => AddTaskActivityFunc(payload)
    })
}

export const useUpdateTaskActivity = () => {
    return useMutation({
        mutationFn: (payload:any) => UpdateTaskActivityFunc(payload)
    })
}

export const useDeleteTaskActivity = () => {
    return useMutation({
        mutationFn: (payload: any) => DeleteTaskActivityFunc(payload)
    })
}

//Flows
export const useGetFlowsByProject = () => {
    return useMutation({
        mutationFn: (project_id:string) => GetFlowsByProjectFunc(project_id)
    })
}

export const useGetBusinessStaffsWithSkills = (business_id:string) => {
    return useQuery({
        queryKey: ["staffs", business_id],
        queryFn: ()=> GetBusinessStaffsWithSkills(business_id),
        enabled: !!business_id
    })
}

export const useGetStaffsByDepartment = () => {
    return useMutation({
        mutationFn: (department_id:string) => GetStaffsByDepartment(department_id)
    })
}

//Get user all details
// export const useGetUserDetails = (role_id:string, org_id:string) => {
//     return useQuery({
//         queryKey: ["user", role_id, org_id],
//         queryFn: () => GetUserDetails(role_id, org_id),
//         enabled: !!role_id && !!org_id
//     })
// }

export const useGetUserDetails = () => {
    return useMutation({
            mutationFn: ({ role_id, org_id }: { role_id: string; org_id: string }) =>
      GetUserDetails(role_id, org_id),
    })
}


//Get Staff-tasks by filter
export const useGetAllStaffTasks = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["tasks", queryParams],
        queryFn: () => GetStaffTasksByFilter(queryParams),
        enabled: !!queryParams
    })
}


//Get Staff-Projects by filter
export const useGetStaffProjects = (queryParams: Record<string, string | undefined>) => {
    return useQuery({
        queryKey: ["projects", queryParams],
        queryFn: () => GetStaffProjects(queryParams),
        enabled: !!queryParams
    })
}

//Get Business Details for Staff
export const useGetStaffBusinessDetails = () => {
    return useMutation({
        mutationFn: (domain_id:string) => GetBusinessForStaff(domain_id),
    })
}

//Get All Staffs in StaffsView
export const useGetAllStaffsForStaff = () => {
    return useMutation({
        mutationFn: (role_id:string) => GetAllStaffsForStaff(role_id),
    })
}

//Get Single staff by id
export const useGetSingleStaffById = (user_id:string, role_id:string) => {
    return useQuery({
        queryKey: ["staff", user_id, role_id],
        queryFn: () => GetSingleStaffbyId(user_id, role_id),
        enabled: !!user_id && !!role_id
    })
}

//Get Departments for Staff Heads
export const useGetDepartmentsForHeads = () => {
   return useMutation({
    mutationFn: (role_id:string) => GetDepartmentsforHeads(role_id),
   })
}

//Get Areas for Staff Heads
export const useGetAreasForHeads = () => {
    return useMutation({
     mutationFn: () => GetAreasForHeads(),
    })
}

//Get areas and depts under a region
export const useGetAreasandDeptsForRegion = () => {
    return useMutation({
        mutationFn: (region_id:string) => GetAreasandDeptsUnderRegion(region_id),
    })
}

//Get Locations and depts for area
export const useGetLocationsandDeptsForArea = () => {
    return useMutation({
        mutationFn: (area_id:string) => GetLocationsandDeptsUnderArea(area_id),
    })
}

//Get Depts for Location
export const useGetDeptsforLoation = () => {
    return useMutation({
        mutationFn: (location_id:string) => GetDepartmentsforLocations(location_id),
    })
}

//Get Projects By Id for Staffs
export const useGetProjectsbyIdForStaffs = (project_id:string) => {
    return useQuery({
        queryKey: ["project", project_id],
        queryFn: () => GetProjectByIdForStaffs(project_id),
        enabled: !!project_id,
    })
}

//Add New Project from staff side
export const useAddNewProjectByStaff = () => {
    return useMutation({
        mutationFn: (payload:any) => AddNewProjectByStaff(payload),
    })
}

//Get Departments for Staffs
export const useGetDepartmentsForStaffs = () => {
  return useMutation({
    mutationFn: ({ role_id, org_id }: { role_id: string; org_id: string }) => 
      GetDepartmentsForStaffs(role_id, org_id),
  });
};

//Remove Region Dept Head
export const useRemoveRegionDeptHead = () => {
    return useMutation({
        mutationFn: (head_id: string) => RemoveRegionDepartmentHead(head_id),
    })
}
