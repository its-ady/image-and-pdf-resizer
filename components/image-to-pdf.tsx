"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Plus,
  Download,
  Grid3X3,
  Trash2,
  RotateCcw,
  Move,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const A4_W = 595
const A4_H = 842
const MAX_CANVAS_W = 380

interface PlacedImage {
  id: string
  src: string
  naturalW: number
  naturalH: number
  x: number
  y: number
  w: number
  h: number
}

let counter = 0
function uid() {
  return "img-" + ++counter + "-" + Date.now()
}

export function ImageToPdf() {
  const [images, setImages] = useState<PlacedImage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use ref for display scale to avoid stale closures
  const [displayScale, setDisplayScale] = useState(1)
  const displayScaleRef = useRef(displayScale)
  displayScaleRef.current = displayScale

  useEffect(() => {
    function calc() {
      const w = Math.min(window.innerWidth - 32, MAX_CANVAS_W)
      setDisplayScale(w / A4_W)
    }
    calc()
    window.addEventListener("resize", calc)
    return () => window.removeEventListener("resize", calc)
  }, [])

  const displayW = A4_W * displayScale
  const displayH = A4_H * displayScale

  // Add images from file picker
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const fileArray = Array.from(files)
    fileArray.forEach((file) => {
      if (!file.type.startsWith("image/")) return
      const reader = new FileReader()
      reader.onload = () => {
        const imgEl = new window.Image()
        imgEl.crossOrigin = "anonymous"
        imgEl.onload = () => {
          const maxW = A4_W * 0.8
          const maxH = A4_H * 0.4
          let w = imgEl.naturalWidth
          let h = imgEl.naturalHeight
          if (w > maxW) {
            h = (h * maxW) / w
            w = maxW
          }
          if (h > maxH) {
            w = (w * maxH) / h
            h = maxH
          }

          const placed: PlacedImage = {
            id: uid(),
            src: reader.result as string,
            naturalW: imgEl.naturalWidth,
            naturalH: imgEl.naturalHeight,
            x: (A4_W - w) / 2,
            y: 40 + (Math.random() * 100),
            w,
            h,
          }
          setImages((prev) => [...prev, placed])
          setSelectedId(placed.id)
        }
        imgEl.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }, [])

  // Auto grid arrangement
  const autoGrid = useCallback(() => {
    setImages((prev) => {
      if (prev.length === 0) return prev
      const padding = 20
      const gap = 12
      const usableW = A4_W - padding * 2
      const usableH = A4_H - padding * 2

      let cols: number
      if (prev.length === 1) cols = 1
      else if (prev.length <= 4) cols = 2
      else cols = 3

      const rows = Math.ceil(prev.length / cols)
      const cellW = (usableW - gap * (cols - 1)) / cols
      const cellH = (usableH - gap * (rows - 1)) / rows

      return prev.map((img, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const ratio = img.naturalW / img.naturalH
        let w = cellW
        let h = w / ratio
        if (h > cellH) {
          h = cellH
          w = h * ratio
        }
        const x = padding + col * (cellW + gap) + (cellW - w) / 2
        const y = padding + row * (cellH + gap) + (cellH - h) / 2
        return { ...img, x, y, w, h }
      })
    })
  }, [])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setImages((prev) => prev.filter((img) => img.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  const resetAll = useCallback(() => {
    setImages([])
    setSelectedId(null)
  }, [])

  // Drag / resize with refs to avoid stale closures
  const dragRef = useRef<{
    mode: "move" | "resize"
    imgId: string
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
    origRatio: number
  } | null>(null)

  const startDrag = useCallback(
    (e: React.PointerEvent, imgId: string, mode: "move" | "resize") => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedId(imgId)

      // Find the image from current state using a functional approach
      setImages((prev) => {
        const img = prev.find((i) => i.id === imgId)
        if (img) {
          dragRef.current = {
            mode,
            imgId,
            startX: e.clientX,
            startY: e.clientY,
            origX: img.x,
            origY: img.y,
            origW: img.w,
            origH: img.h,
            origRatio: img.w / img.h,
          }
        }
        return prev // No mutation
      })
    },
    []
  )

  // Global pointer handlers
  useEffect(() => {
    const handleMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return

      const scale = displayScaleRef.current
      const dx = (ev.clientX - d.startX) / scale
      const dy = (ev.clientY - d.startY) / scale

      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== d.imgId) return img
          if (d.mode === "move") {
            const newX = Math.max(0, Math.min(A4_W - img.w, d.origX + dx))
            const newY = Math.max(0, Math.min(A4_H - img.h, d.origY + dy))
            return { ...img, x: newX, y: newY }
          } else {
            let newW = Math.max(30, d.origW + dx)
            let newH = newW / d.origRatio
            if (img.x + newW > A4_W) {
              newW = A4_W - img.x
              newH = newW / d.origRatio
            }
            if (img.y + newH > A4_H) {
              newH = A4_H - img.y
              newW = newH * d.origRatio
            }
            return { ...img, w: newW, h: newH }
          }
        })
      )
    }

    const handleUp = () => {
      dragRef.current = null
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [])

  // Convert to PDF
  const convertToPdf = useCallback(async () => {
    if (images.length === 0) return
    setConverting(true)
    try {
      const { PDFDocument } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([A4_W, A4_H])

      for (const img of images) {
        // Convert all images to JPEG via canvas for reliability
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.naturalW)
        canvas.height = Math.round(img.naturalH)
        const ctx = canvas.getContext("2d")
        if (!ctx) continue

        const htmlImg = new window.Image()
        htmlImg.crossOrigin = "anonymous"
        await new Promise<void>((resolve) => {
          htmlImg.onload = () => {
            ctx.drawImage(htmlImg, 0, 0)
            resolve()
          }
          htmlImg.onerror = () => resolve()
          htmlImg.src = img.src
        })

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
        )
        if (!blob) continue

        const jpgBytes = new Uint8Array(await blob.arrayBuffer())
        const pdfImage = await pdfDoc.embedJpg(jpgBytes)

        // pdf-lib Y axis is from bottom
        page.drawImage(pdfImage, {
          x: img.x,
          y: A4_H - img.y - img.h,
          width: img.w,
          height: img.h,
        })
      }

      const pdfBytes = await pdfDoc.save()
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = "images-to-pdf.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[v0] PDF conversion error:", err)
      alert("Failed to convert. Please try again.")
    } finally {
      setConverting(false)
    }
  }, [images])

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            // Reset so same file can be re-selected
            e.target.value = ""
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="size-4" />
          Add Photos
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={autoGrid}
          disabled={images.length === 0}
        >
          <Grid3X3 className="size-4" />
          Auto Grid
        </Button>
        {selectedId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={deleteSelected}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
        {images.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={resetAll}
          >
            <RotateCcw className="size-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* A4 Canvas */}
      <div className="flex justify-center overflow-hidden">
        <div
          className="relative border-2 border-border bg-white shadow-lg"
          style={{
            width: displayW,
            height: displayH,
            touchAction: "none",
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* Margin guides */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={displayW}
            height={displayH}
          >
            <rect
              x={20 * displayScale}
              y={20 * displayScale}
              width={(A4_W - 40) * displayScale}
              height={(A4_H - 40) * displayScale}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Empty state */}
          {images.length === 0 && (
            <button
              type="button"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <Plus className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground/60">Tap to add photos</p>
              <p className="text-xs text-foreground/40">Place images on this A4 page</p>
            </button>
          )}

          {/* Placed images */}
          {images.map((img) => {
            const isSelected = selectedId === img.id
            return (
              <div
                key={img.id}
                className={`absolute select-none ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-1"
                    : "ring-0 hover:ring-1 hover:ring-primary/30"
                }`}
                style={{
                  left: img.x * displayScale,
                  top: img.y * displayScale,
                  width: img.w * displayScale,
                  height: img.h * displayScale,
                  touchAction: "none",
                  zIndex: isSelected ? 50 : 1,
                  cursor: isSelected ? "grab" : "pointer",
                }}
                onPointerDown={(e) => startDrag(e, img.id, "move")}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId(img.id)
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt="Placed photo"
                  className="pointer-events-none size-full object-fill"
                  draggable={false}
                />

                {/* Move label */}
                {isSelected && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow">
                    <Move className="mr-0.5 inline size-3" />
                    Drag
                  </div>
                )}

                {/* Resize handle */}
                {isSelected && (
                  <div
                    className="absolute -bottom-2.5 -right-2.5 z-50 flex size-7 cursor-se-resize items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                    onPointerDown={(e) => startDrag(e, img.id, "resize")}
                  >
                    <Maximize2 className="size-3.5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Info text */}
      <p className="text-center text-xs text-muted-foreground leading-relaxed">
        {images.length === 0
          ? "Add photos from your gallery to arrange on the A4 page"
          : `${images.length} photo${images.length > 1 ? "s" : ""} placed. Tap to select, drag to move, corner handle to resize.`}
      </p>

      {/* Convert button */}
      <Button
        onClick={convertToPdf}
        disabled={images.length === 0 || converting}
        className="w-full gap-2 bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
        size="lg"
      >
        {converting ? (
          <>
            <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Converting...
          </>
        ) : (
          <>
            <Download className="size-4" />
            Convert to PDF
          </>
        )}
      </Button>
    </div>
  )
}
