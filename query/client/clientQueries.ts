import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAddClients = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await axios.post("/api/client/add", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await axios.post("/api/client/update", payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      const clientId = (() => {
        try {
          const parsed = JSON.parse(String(variables.get("clientUpdateForm")));
          return parsed?.clientId;
        } catch {
          return undefined;
        }
      })();
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      }
    },
  });
};

export const useGetAllClients = (userId: string) => {
  return useQuery({
    queryKey: ["clients", userId],
    queryFn: async () => {
      const res = await axios.get(`/api/client/get-all/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });
};

export const useGetClientById = (clientId: string) => {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const res = await axios.get(`/api/client/get-id/${clientId}?clientprojects=1`);
      return res.data;
    },
    enabled: !!clientId,
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const res = await axios.post("/api/client/delete", { clientid: clientId });
      return res.data;
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
};

export const useAddContactCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await axios.post("/api/client/contact-card/add", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?._id) {
        queryClient.invalidateQueries({ queryKey: ["client", String(data._id)] });
      }
    },
  });
};

export const useUpdateContactCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await axios.post("/api/client/contact-card/update", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?._id) {
        queryClient.invalidateQueries({ queryKey: ["client", String(data._id)] });
      }
    },
  });
};

export const useDeleteContactCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { clientId: string; cardId: string }) => {
      const res = await axios.post("/api/client/contact-card/delete", payload);
      return res.data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["client", payload.clientId] });
    },
  });
};

export const useClientOnView = () => {
  return useMutation({
    mutationFn: async (clientId: string) => {
      const res = await axios.post("/api/client/action/onview", { clientId });
      return res.data;
    },
  });
};
