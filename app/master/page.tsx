"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/master/dashboard')
  }, [router])

  return null
}
