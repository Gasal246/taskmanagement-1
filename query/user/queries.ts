import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
    addBusinessStaff,
    AddNewAgent,
    addUserAreaFunc,
    addUserDocFunc,
    addUserLocationFunc,
    addUserRegionFunc,
    addUserRoleFunc,
    addUserSkillFunc,
    CheckTodo,
    DeleteTodo,
    GetAdminProfile,
    GetAllUserTodos,
    getBusinessStaffs,
    GetFullStaffProfile,
    getUserByEmail,
    getUserByUserId,
    getUserCompleteProfileFunc,
    getUserDomainByRole,
    getUserRolesAndDomains,
    PostTodo,
    removeUserAreaFunc,
    removeUserDocFunc,
    removeUserLocationFunc,
    removeUserRegionFunc,
    removeUserRoleFunc,
    removeUserSkillFunc,
    sendEmailVerification,
    setupUserPassword,
    UpdateStaffProfile,
    updateUserData,
    verifyUserOtp
} from "./function";
import { USER_KEYS } from "./keys";
import Roles from "@/models/roles.model";

export const useGetUserByEmail = () => {
    return useMutation({
        mutationFn: (email: string) => getUserByEmail(email)
    })
};

export const useGetUserByUserId = () => {
    return useMutation({
        mutationFn: (userid: string) => getUserByUserId(userid)
    })
}

export const useSendEmailVerification = () => {
    return useMutation({
        mutationFn: (email: string) => sendEmailVerification(email)
    })
};

export const useVerifyUserOtp = () => {
    return useMutation({
        mutationFn: ({ email, otp }: { email: string, otp: string }) => verifyUserOtp({ email, otp })
    })
};

export const useSetupUserPassword = () => {
    return useMutation({
        mutationFn: ({ email, password }: { email: string, password: string }) => setupUserPassword({ email, password })
    })
}

export const useGetUserRolesAndDomains = (userid: string) => {
    return useQuery({
        queryKey: [USER_KEYS.GET_USER_ROLES_AND_DOMAINS],
        queryFn: () => getUserRolesAndDomains(userid)
    });
}

export const useGetUserDomainByRole = () => {
    return useMutation({
        mutationFn: ({userid, role}: {userid: string, role: string}) => getUserDomainByRole(userid, role)
    })
}

export const useGetBusinessStaffs = (business_id: string) => {
    return useQuery({
        queryKey: [USER_KEYS.GET_BUSINESS_STAFFS],
        queryFn: () => getBusinessStaffs(business_id)
    })
}

export const useAddBusinessStaff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => addBusinessStaff(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [USER_KEYS.GET_BUSINESS_STAFFS]
            })
        }
    })
}

export const useGetUserCompleteProfile = () => {
    return useMutation({
        mutationFn: (userId: string) => getUserCompleteProfileFunc(userId)
    })
}

// add and remove ROLE, REGION, AREA, SKILL, DOC

export const useAddUserRole = () => {
    return useMutation({
        mutationFn: (payload: any) => addUserRoleFunc(payload)
    })
}

export const useRemoveUserRole = () => {
    return useMutation({
        mutationFn: (URoleId: string) => removeUserRoleFunc(URoleId)
    })
}

export const useAddUserRegion = () => {
    return useMutation({
        mutationFn: (payload: any) => addUserRegionFunc(payload)
    })
}

export const useRemoveUserRegion = () => {
    return useMutation({
        mutationFn: (URegId: string) => removeUserRegionFunc(URegId)
    })
}

export const useAddUserArea = () => {
    return useMutation({
        mutationFn: (payload: any) => addUserAreaFunc(payload)
    })
}

export const useRemoveUserArea = () => {
    return useMutation({
        mutationFn: (UAreaId: string) => removeUserAreaFunc(UAreaId)
    })
}

export const useAddUserLocation = () => {
    return useMutation({
        mutationFn: (payload: any) => addUserLocationFunc(payload)
    })
}

export const useRemoveUserLocation = () => {
    return useMutation({
        mutationFn: (ULocId: string) => removeUserLocationFunc(ULocId)
    })
}

export const useAddUserSkill = () => {
    return useMutation({
        mutationFn: (payload: any) => addUserSkillFunc(payload)
    })
}

export const useRemoveUserSkill = () => {
    return useMutation({
        mutationFn: (USkillId: string) => removeUserSkillFunc(USkillId)
    })
}

export const useAddUserDoc = () => {
    return useMutation({
        mutationFn: (payload: any) => addUserDocFunc(payload)
    })
}

export const useRemoveUserDoc = () => {
    return useMutation({
        mutationFn: (UDocId: string) => removeUserDocFunc(UDocId)
    })
}

export function useFindUserById(userId:string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/user?userid=${userId}`);
      if (!res.ok) throw new Error('User not found');
      return res.json();
    },
    enabled: !!userId
  });
}

//Get Staff Profile.
export const useGetStaffProfile = () => {
    return useMutation({
        mutationFn: ({role_id, org_id}: {role_id:string, org_id:string}) => GetFullStaffProfile(role_id, org_id),
    })
}

//Update Staff Profile
export const useUpdateStaffProfile = () => {
    return useMutation({
        mutationFn: (payload: any) => UpdateStaffProfile(payload),
    })
}

//Get Admin Profile
export const useGetAdminProfile = (business_id: string) => {
    return useQuery({
        queryKey: ["user", business_id],
        queryFn: () => GetAdminProfile(business_id),
        enabled:  !!business_id,
    })
} 

//Get all user todos
export const useGetAllUserTodos = () => {
    return useQuery({
        queryKey: ["todos"],
        queryFn: () => GetAllUserTodos(),
    })
}

//Post new user todo
export const usePostNewTodo = () => {
    return useMutation({
        mutationFn: (payload:any) => PostTodo(payload),
    })
} 

//Check and Uncheck Todo
export const useCheckTodo = () => {
    return useMutation({
        mutationFn: (payload:any) => CheckTodo(payload),
    })
}

//Delete Todo
export const useDeleteTodo = () => {
    return useMutation({
        mutationFn: (todo_id:string) => DeleteTodo(todo_id),
    })
}

//Add New Agent
export const useAddNewAgent = () => {
    return useMutation({
        mutationFn: (payload: any) => AddNewAgent(payload),
    })
}


// gasal update user
export const useUpdateUserInfo = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => updateUserData(payload),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({
                queryKey: [USER_KEYS.GET_BUSINESS_STAFFS]
            })
        }
    })
}