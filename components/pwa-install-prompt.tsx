"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed this session
    const wasDismissed = sessionStorage.getItem("pwa-install-dismissed")
    if (wasDismissed) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowBanner(false)
    }

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    sessionStorage.setItem("pwa-install-dismissed", "true")
  }

  if (!showBanner || dismissed) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-2xl p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Download className="size-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground">
              Install App
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Add to home screen for offline access
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleInstall}
              className="rounded-xl text-xs font-semibold h-9 px-4"
            >
              Install
            </Button>
            <button
              onClick={handleDismiss}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
