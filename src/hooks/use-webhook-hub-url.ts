'use client'

import { useEffect, useState } from 'react'

function isLocalUrl(url: string): boolean {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return url.startsWith('/') || url.includes('localhost')
  }
}

export function useWebhookHubUrl(path = '/api/gates2b/webhook') {
  const [webhookHubUrl, setWebhookHubUrl] = useState(path)
  const [isLocalDev, setIsLocalDev] = useState(false)

  useEffect(() => {
    let resolved = path
    if (typeof window !== 'undefined') {
      resolved = `${window.location.origin}${path}`
    }

    void fetch('/api/checkout/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.webhookGates2bUrl) {
          resolved = json.data.webhookGates2bUrl as string
        }
        setWebhookHubUrl(resolved)
        setIsLocalDev(isLocalUrl(resolved))
      })
      .catch(() => {
        setWebhookHubUrl(resolved)
        setIsLocalDev(isLocalUrl(resolved))
      })
  }, [path])

  return { webhookHubUrl, isLocalDev }
}
