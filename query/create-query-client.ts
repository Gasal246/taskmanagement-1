import { MutationCache, QueryClient } from "@tanstack/react-query";

// Some legacy lookup hooks use mutations for reads. They must never trigger
// refreshes (or lock the screen while dependent dropdowns are loading).
export function isInteractiveMutation(mutation: { meta?: Record<string, unknown> }) {
  return mutation.meta?.background !== true;
}

export function createQueryClient(reportError: (message: string) => void) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error: any) => count < 1 && (!error?.response?.status || error.response.status >= 500),
      },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache({
      onSuccess: async (data, _variables, _context, mutation) => {
        if (mutation.meta?.refresh === false || !isInteractiveMutation(mutation)) return;
        // Legacy endpoints sometimes return an error body instead of rejecting.
        if (data && typeof data === "object" && "status" in data && Number(data.status) >= 400) return;
        // Cross-module writes affect lists, counts, details and permission-based
        // views. Refresh mounted queries only; other cached views become stale.
        // Await this so the mutation stays pending until the screen is current.
        await client.invalidateQueries({}, { throwOnError: true }).catch(() => {
          reportError("Your change was saved, but the latest data could not be loaded. Refresh the page to see it.");
        });
      },
      onError: (error: any, _variables, _context, mutation) => {
        if (!mutation.options.onError) reportError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "The operation failed. Try again.");
      },
    }),
  });
  return client;
}
