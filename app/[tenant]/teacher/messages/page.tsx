"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"
import MessagesPage from "@/components/shared/messages-page"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
})

function MessagesPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <MessagesPage />
    </QueryClientProvider>
  )
}

export default MessagesPageWrapper
