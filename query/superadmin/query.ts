import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SUPER_ADMIN_KEYS } from "./keys";
import { addApplicationRole, addPlan, deletePlan, deleteRole, editPlan, getApplicationRoles, getPlans, getSuperUserById } from "./function";

export const useGetSuperAdminById = (id: string) => {
    return useQuery({
        queryKey: [SUPER_ADMIN_KEYS.GET_ADMIN_BY_ID, id],
        queryFn: async () => getSuperUserById(id),
        enabled: !!id
    })
}

export const useGetPlans = () => {
    return useQuery({
        queryKey: [SUPER_ADMIN_KEYS.GET_PLANS],
        queryFn: async () => getPlans()
    })
}

export const useAddPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await addPlan(data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [SUPER_ADMIN_KEYS.GET_PLANS],
            });
        },
    });
}

export const useEditPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await editPlan(data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [SUPER_ADMIN_KEYS.GET_PLANS],
            });
        },
    });
}

export const useDeletePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await deletePlan(id);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [SUPER_ADMIN_KEYS.GET_PLANS],
            });
        },
    });
}

export const useGetApplicationRoles = () => {
    return useQuery({
        queryKey: [SUPER_ADMIN_KEYS.GET_ROLES],
        queryFn: async () => getApplicationRoles()
    })
}

export const useAddApplicationRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await addApplicationRole(data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [SUPER_ADMIN_KEYS.GET_ROLES],
            });
        },
    });
}

export const useRemoveRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await deleteRole(id);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [SUPER_ADMIN_KEYS.GET_ROLES],
            });
        },
    });
}