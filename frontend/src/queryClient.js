import { QueryClient } from '@tanstack/react-query'

/**
 * Defaults tuned for dashboard-style SaaS: fewer duplicate GETs, SWR-style freshness.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
