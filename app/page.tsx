"use client"

import { ImageIcon, FileText, Zap, Shield, Smartphone } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppHeader } from "@/components/app-header"
import { ImageResizer } from "@/components/image-resizer"
import { PdfResizer } from "@/components/pdf-resizer"
import { PwaRegister } from "@/components/pwa-register"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { OfflineIndicator } from "@/components/offline-indicator"

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <PwaRegister />
      <OfflineIndicator />
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Hero section */}
        <section className="mb-8 text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
            Resize Images & PDFs Instantly
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base text-pretty">
            Compress your files to the exact size you need. Fast, free, and works right in your browser.
          </p>
        </section>

        {/* Features chips */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Zap className="size-3" />
            Lightning Fast
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
            <Shield className="size-3" />
            100% Private
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <Smartphone className="size-3" />
            Mobile Friendly
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="image" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-secondary rounded-xl p-1">
            <TabsTrigger
              value="image"
              className="gap-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <ImageIcon className="size-4" />
              Image
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="gap-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <FileText className="size-4" />
              PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-6">
            <ImageResizer />
          </TabsContent>

          <TabsContent value="pdf" className="mt-6">
            <PdfResizer />
          </TabsContent>
        </Tabs>

        {/* How it works */}
        <section className="mt-10 mb-8">
          <h3 className="font-[family-name:var(--font-heading)] mb-4 text-center text-lg font-bold text-foreground">
            How It Works
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StepCard
              step={1}
              title="Upload"
              description="Select an image or PDF from your device"
            />
            <StepCard
              step={2}
              title="Choose Size"
              description="Pick a preset or enter a custom target size"
            />
            <StepCard
              step={3}
              title="Download"
              description="Get your compressed file in seconds"
            />
          </div>
        </section>

        {/* Supported formats */}
        <section className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-[family-name:var(--font-heading)] mb-3 text-sm font-bold text-foreground">
            Supported Formats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-primary">Images</p>
              <div className="flex flex-wrap gap-1.5">
                {["JPEG", "PNG", "WebP", "BMP", "GIF"].map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-destructive">Documents</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  PDF
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4 pb-20">
        <p className="text-center text-xs text-muted-foreground">
          Image & PDF Resizer — All processing happens in your browser. Your files never leave your device.
        </p>
      </footer>

      <PwaInstallPrompt />
    </div>
  )
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm">
      <div className="flex size-9 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-heading)] text-sm font-bold text-primary-foreground">
        {step}
      </div>
      <h4 className="font-[family-name:var(--font-heading)] text-sm font-bold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
