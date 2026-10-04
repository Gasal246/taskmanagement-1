"use client"
import React from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

const TanstackProvider = ({ children }:{ children: React.ReactNode }) => {
    const [queryClient] = React.useState(() => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: (count, error: any) => count < 1 && (!error?.response?.status || error.response.status >= 500),
        },
        mutations: { retry: false },
      },
      mutationCache: new MutationCache({
        onError: (error: any, _variables, _context, mutation) => {
          if (!mutation.options.onError) toast.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || "The operation failed. Try again.");
        },
      }),
    }))
  return (
    <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
  )
}

export default TanstackProvider
