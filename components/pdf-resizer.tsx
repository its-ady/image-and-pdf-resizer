"use client"

import { useState, useCallback, useRef } from "react"
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

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsCache: any = null

async function loadPdfJs() {
  if (pdfjsCache) return pdfjsCache

  // Load pdf.js from CDN to avoid bundler issues
  await new Promise<void>((resolve, reject) => {
    if ((window as any).pdfjsLib) { resolve(); return }
    const script = document.createElement("script")
    script.src = `${PDFJS_CDN}/pdf.min.js`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load PDF.js"))
    document.head.appendChild(script)
  })

  const pdfjsLib = (window as any).pdfjsLib
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`
  pdfjsCache = pdfjsLib
  return pdfjsLib
}

async function renderPageToBlob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scaleFactor: number,
  quality: number
): Promise<Blob> {
  const viewport = page.getViewport({ scale: scaleFactor })
  const canvas = document.createElement("canvas")
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  await page.render({ canvasContext: ctx, viewport }).promise

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality
    )
  })
}

async function compressPdfClient(
  fileBuffer: ArrayBuffer,
  targetSize: number,
  onProgress: (p: number) => void
): Promise<Blob> {
  const pdfjsLib = await loadPdfJs()
  const { PDFDocument } = await import("pdf-lib")

  onProgress(10)

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise
  const numPages = pdfDoc.numPages

  onProgress(15)

  // Get original page dimensions
  const pageInfos: { width: number; height: number }[] = []
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    pageInfos.push({ width: vp.width, height: vp.height })
  }

  // Binary search for the right quality + scale combo
  let bestBlob: Blob | null = null
  let lo = 0.02
  let hi = 1.0
  const maxAttempts = 8

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const mid = (lo + hi) / 2
    // quality ranges 0.1 - 0.92, scale ranges 0.3 - 2.0
    const quality = Math.max(0.1, Math.min(0.92, mid))
    const scale = Math.max(0.3, Math.min(2.0, mid * 2))

    onProgress(20 + Math.round((attempt / maxAttempts) * 60))

    const newPdf = await PDFDocument.create()

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const jpegBlob = await renderPageToBlob(page, scale, quality)
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer())

      const jpegImage = await newPdf.embedJpg(jpegBytes)

      // Use original page dimensions (in PDF points at 72 DPI)
      const pageWidth = pageInfos[i - 1].width
      const pageHeight = pageInfos[i - 1].height
      const pdfPage = newPdf.addPage([pageWidth, pageHeight])

      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      })
    }

    const pdfBytes = await newPdf.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    bestBlob = blob

    if (blob.size <= targetSize) {
      // We might be able to go higher quality
      lo = mid
    } else {
      hi = mid
    }

    // Close enough - within 5% of target or under target
    if (blob.size <= targetSize && blob.size >= targetSize * 0.8) {
      break
    }
  }

  onProgress(90)

  // If still too large after binary search, do a final aggressive pass
  if (bestBlob && bestBlob.size > targetSize) {
    const ratio = targetSize / bestBlob.size
    const aggressiveQuality = Math.max(0.05, ratio * 0.5)
    const aggressiveScale = Math.max(0.15, ratio * 0.8)

    const newPdf = await PDFDocument.create()

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const jpegBlob = await renderPageToBlob(page, aggressiveScale, aggressiveQuality)
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer())

      const jpegImage = await newPdf.embedJpg(jpegBytes)
      const pageWidth = pageInfos[i - 1].width
      const pageHeight = pageInfos[i - 1].height
      const pdfPage = newPdf.addPage([pageWidth, pageHeight])

      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      })
    }

    const pdfBytes = await newPdf.save()
    bestBlob = new Blob([pdfBytes], { type: "application/pdf" })
  }

  onProgress(100)
  return bestBlob!
}

export function PdfResizer() {
  const [file, setFile] = useState<File | null>(null)
  const [targetSize, setTargetSize] = useState<number | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

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
    setProgress(5)
    abortRef.current = false

    try {
      const buffer = await file.arrayBuffer()

      // If file is already under target, just return it
      if (file.size <= targetSize) {
        const blob = new Blob([buffer], { type: "application/pdf" })
        if (resultUrl) URL.revokeObjectURL(resultUrl)
        const url = URL.createObjectURL(blob)
        setResultBlob(blob)
        setResultUrl(url)
        setProgress(100)
        setCompressing(false)
        return
      }

      const blob = await compressPdfClient(buffer, targetSize, (p) => {
        if (!abortRef.current) setProgress(p)
      })

      if (abortRef.current) return

      if (resultUrl) URL.revokeObjectURL(resultUrl)
      const url = URL.createObjectURL(blob)
      setResultBlob(blob)
      setResultUrl(url)
      setProgress(100)
    } catch (err) {
      console.error("PDF compression error:", err)
      setError(
        err instanceof Error ? err.message : "Compression failed. Try a different target size."
      )
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
    abortRef.current = true
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setFile(null)
    setTargetSize(null)
    setCompressing(false)
    setProgress(0)
    setResultBlob(null)
    setResultUrl(null)
    setError(null)
  }

  const sizeIncreased = resultBlob && file && resultBlob.size > file.size

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
          <p className="text-center text-xs text-muted-foreground">
            Rendering pages & compressing... {progress}%
          </p>
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
        <div className={`flex flex-col gap-4 rounded-xl border p-4 ${
          sizeIncreased
            ? "border-destructive/30 bg-destructive/5"
            : "border-accent/30 bg-accent/5"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`flex size-8 items-center justify-center rounded-full ${
              sizeIncreased
                ? "bg-destructive text-destructive-foreground"
                : "bg-accent text-accent-foreground"
            }`}>
              {sizeIncreased ? (
                <AlertCircle className="size-4" />
              ) : (
                <Check className="size-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {sizeIncreased ? "Compression Limited" : "Compression Complete"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} {"->"} {formatSize(resultBlob.size)}
                {!sizeIncreased && (
                  <span className="ml-1 font-semibold text-accent">
                    ({Math.round((1 - resultBlob.size / file.size) * 100)}% reduced)
                  </span>
                )}
              </p>
              {resultBlob.size > targetSize && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Could not reach {formatSize(targetSize)} — this is the smallest achievable size.
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleDownload}
            className={`w-full gap-2 ${
              sizeIncreased
                ? "bg-muted text-foreground hover:bg-muted/80"
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            }`}
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
