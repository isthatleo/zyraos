"use client"

type ParentDashboardFetchResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function shouldRetryAuth(status: number, message: string) {
  return status === 401 || status === 403 || /unauthori[sz]ed|session|tenant/i.test(message)
}

export async function fetchParentDashboardJson<T>(
  endpoint: string,
  fallbackMessage: string,
  attempts = 5
): Promise<ParentDashboardFetchResult<T>> {
  let lastMessage = fallbackMessage

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(endpoint, {
      cache: "no-store",
      credentials: "include",
    }).catch(() => null)

    if (response?.ok) {
      return { data: (await response.json()) as T, error: null }
    }

    const body = await response?.json().catch(() => ({}))
    lastMessage = String(body?.error || fallbackMessage)

    if (!response || !shouldRetryAuth(response.status, lastMessage) || attempt === attempts - 1) {
      return { data: null, error: lastMessage }
    }

    await sleep(250 + attempt * 350)
  }

  return { data: null, error: lastMessage }
}
