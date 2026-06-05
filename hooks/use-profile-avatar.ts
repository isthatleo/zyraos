"use client"

import * as React from "react"

import {
  readCachedUserProfile,
  USER_PROFILE_CACHE_KEY,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfileUpdateDetail,
} from "@/components/profile-form"

export function useProfileAvatar<T extends { name?: string | null; image?: string | null } | null | undefined>(user: T) {
  const [override, setOverride] = React.useState<UserProfileUpdateDetail>({})
  const [sessionAvatarVersion] = React.useState(() => Date.now())

  React.useEffect(() => {
    const cached = readCachedUserProfile()
    if (cached) setOverride((current) => ({ ...current, ...cached }))

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UserProfileUpdateDetail>).detail || {}
      setOverride((current) => ({ ...current, ...detail }))
    }
    const handleProfileStorage = (event: StorageEvent) => {
      if (event.key !== USER_PROFILE_CACHE_KEY || !event.newValue) return
      const raw = event.newValue
      try {
        setOverride((current) => ({ ...current, ...JSON.parse(raw) }))
      } catch {}
    }

    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener)
    window.addEventListener("storage", handleProfileStorage)
    return () => {
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener)
      window.removeEventListener("storage", handleProfileStorage)
    }
  }, [])

  return {
    displayName: override.name || user?.name || undefined,
    displayImage:
      override.image !== undefined
        ? override.image || undefined
        : user?.image
          ? `/api/profile/avatar?v=${override.avatarVersion || sessionAvatarVersion}`
          : undefined,
  }
}
