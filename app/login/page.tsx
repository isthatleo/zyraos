"use client"

import { LoginForm } from "@/components/login-form"
import { RoleSelection } from "@/components/role-selection"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const role = searchParams?.get("role")

  // No role selected → show role selection cards
  if (!role) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-4xl">
          <RoleSelection />
        </div>
      </div>
    )
  }

  // Role selected → show login form
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><p>Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  )
}
