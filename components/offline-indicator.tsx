"use client"

import { useState, useEffect } from "react"
import { WifiOff, Wifi } from "lucide-react"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const goOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
    }

    const goOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)

    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  if (isOnline && !showReconnected) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 animate-in slide-in-from-top duration-300">
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2.5 text-sm font-medium text-amber-950">
          <WifiOff className="size-4" />
          <span>You are offline — Image compression still works!</span>
        </div>
      ) : showReconnected ? (
        <div className="flex items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground">
          <Wifi className="size-4" />
          <span>Back online</span>
        </div>
      ) : null}
    </div>
  )
}
