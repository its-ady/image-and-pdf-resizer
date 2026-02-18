"use client"

import { useState, useCallback } from "react"
import { Download, RotateCcw, Check, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UploadZone } from "@/components/upload-zone"
import { SizeSelector } from "@/components/size-selector"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function PdfResizer() {
  const [file, setFile] = useState<File | null>(null)
  const [targetSize, setTargetSize] = useState<number | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Please select a PDF file")
      return
    }
    setFile(selectedFile)
    setError(null)
    setResultBlob(null)
    setResultUrl(null)
    setProgress(0)
  }, [])

  const compressPdf = useCallback(async () => {
    if (!file || !targetSize) return

    setCompressing(true)
    setError(null)
    setProgress(10)

    try {
      setProgress(20)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("targetSize", targetSize.toString())

      setProgress(40)

      const response = await fetch("/api/compress-pdf", {
        method: "POST",
        body: formData,
      })

      setProgress(80)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "PDF compression failed")
      }

      const blob = await response.blob()

      if (resultUrl) URL.revokeObjectURL(resultUrl)
      const url = URL.createObjectURL(blob)
      setResultBlob(blob)
      setResultUrl(url)
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
    const baseName = file?.name.replace(/\.[^.]+$/, "") || "resized"
    a.download = `${baseName}_compressed.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [resultBlob, resultUrl, file])

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setFile(null)
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
        accept="application/pdf"
        label="Upload PDF"
        icon="pdf"
        onFileSelect={handleFileSelect}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* File info */}
      <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm border border-border">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
          <FileText className="size-6 text-destructive" />
        </div>
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
        onClick={compressPdf}
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
            <FileText className="size-4" />
            Compress PDF
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
