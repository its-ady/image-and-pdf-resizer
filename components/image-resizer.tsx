"use client"

import { useState, useCallback } from "react"
import { Download, RotateCcw, Check, AlertCircle, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UploadZone } from "@/components/upload-zone"
import { SizeSelector } from "@/components/size-selector"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ImageResizer() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [targetSize, setTargetSize] = useState<number | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, WebP, etc.)")
      return
    }
    setFile(selectedFile)
    setError(null)
    setResultBlob(null)
    setResultUrl(null)
    setProgress(0)

    const url = URL.createObjectURL(selectedFile)
    setPreview(url)
  }, [])

  const compressImage = useCallback(async () => {
    if (!file || !targetSize) return

    setCompressing(true)
    setError(null)
    setProgress(10)

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      const imageUrl = URL.createObjectURL(file)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = imageUrl
      })

      setProgress(30)

      let quality = 0.92
      let scaleFactor = 1
      let bestBlob: Blob | null = null
      const maxIterations = 20

      for (let i = 0; i < maxIterations; i++) {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas not supported")

        const newWidth = Math.round(img.naturalWidth * scaleFactor)
        const newHeight = Math.round(img.naturalHeight * scaleFactor)
        canvas.width = newWidth
        canvas.height = newHeight

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
            "image/jpeg",
            quality
          )
        })

        setProgress(30 + Math.round((i / maxIterations) * 60))

        if (blob.size <= targetSize) {
          bestBlob = blob
          break
        }

        bestBlob = blob

        const ratio = targetSize / blob.size

        if (ratio < 0.3) {
          quality = Math.max(0.01, quality * 0.5)
          scaleFactor = Math.max(0.05, scaleFactor * 0.7)
        } else if (ratio < 0.6) {
          quality = Math.max(0.01, quality * 0.7)
          scaleFactor = Math.max(0.05, scaleFactor * 0.85)
        } else if (ratio < 0.9) {
          quality = Math.max(0.01, quality * 0.85)
        } else {
          quality = Math.max(0.01, quality * 0.95)
        }
      }

      setProgress(95)

      if (bestBlob) {
        if (resultUrl) URL.revokeObjectURL(resultUrl)
        const url = URL.createObjectURL(bestBlob)
        setResultBlob(bestBlob)
        setResultUrl(url)
      }

      URL.revokeObjectURL(imageUrl)
      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed")
    } finally {
      setCompressing(false)
    }
  }, [file, targetSize, resultUrl])

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultUrl) return
    const a = document.createElement("a")
    a.href = resultUrl
    const ext = "jpg"
    const baseName = file?.name.replace(/\.[^.]+$/, "") || "resized"
    a.download = `${baseName}_resized.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [resultBlob, resultUrl, file])

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setFile(null)
    setPreview(null)
    setTargetSize(null)
    setCompressing(false)
    setProgress(0)
    setResultBlob(null)
    setResultUrl(null)
    setError(null)
  }

  if (!file) {
    return (
      <UploadZone
        accept="image/*"
        label="Upload Image"
        icon="image"
        onFileSelect={handleFileSelect}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* File info */}
      <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm border border-border">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="size-14 shrink-0 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ImageIcon className="size-6 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            Original: {formatSize(file.size)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleReset} className="shrink-0">
          <RotateCcw className="size-4" />
          <span className="sr-only">Reset</span>
        </Button>
      </div>

      {/* Size selector */}
      <SizeSelector onSizeSelect={setTargetSize} selectedSize={targetSize} />

      {/* Compress button */}
      <Button
        onClick={compressImage}
        disabled={!targetSize || compressing}
        className="w-full gap-2 bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
        size="lg"
      >
        {compressing ? (
          <>
            <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Compressing...
          </>
        ) : (
          <>
            <ImageIcon className="size-4" />
            Compress Image
          </>
        )}
      </Button>

      {/* Progress */}
      {compressing && (
        <div className="flex flex-col gap-2">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {resultBlob && resultUrl && (
        <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Compression Complete</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} → {formatSize(resultBlob.size)}
                <span className="ml-1 font-semibold text-accent">
                  ({Math.round((1 - resultBlob.size / file.size) * 100)}% reduced)
                </span>
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="overflow-hidden rounded-lg border border-border">
            <img
              src={resultUrl}
              alt="Compressed preview"
              className="w-full object-contain max-h-48"
            />
          </div>

          <Button
            onClick={handleDownload}
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            <Download className="size-4" />
            Download ({formatSize(resultBlob.size)})
          </Button>
        </div>
      )}
    </div>
  )
}
