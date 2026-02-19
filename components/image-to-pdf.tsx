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

// A4 dimensions at 72 DPI (PDF points)
const A4_W = 595
const A4_H = 842

// Display scale (fit on mobile screens)
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

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function ImageToPdf() {
  const [images, setImages] = useState<PlacedImage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Responsive scale
  const [displayScale, setDisplayScale] = useState(1)
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
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return
        const reader = new FileReader()
        reader.onload = () => {
          const img = new window.Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            // Fit image within 80% of A4 width, keeping aspect ratio
            const maxW = A4_W * 0.8
            const maxH = A4_H * 0.4
            let w = img.naturalWidth
            let h = img.naturalHeight
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
              naturalW: img.naturalWidth,
              naturalH: img.naturalHeight,
              x: (A4_W - w) / 2,
              y: images.length === 0 ? 40 : 40 + ((images.length * 30) % (A4_H - h - 80)),
              w,
              h,
            }
            setImages((prev) => [...prev, placed])
            setSelectedId(placed.id)
          }
          img.src = reader.result as string
        }
        reader.readAsDataURL(file)
      })
    },
    [images.length]
  )

  // Auto grid arrangement
  const autoGrid = useCallback(() => {
    if (images.length === 0) return

    const padding = 20
    const gap = 12
    const usableW = A4_W - padding * 2
    const usableH = A4_H - padding * 2

    let cols: number
    if (images.length === 1) cols = 1
    else if (images.length <= 4) cols = 2
    else cols = 3

    const rows = Math.ceil(images.length / cols)
    const cellW = (usableW - gap * (cols - 1)) / cols
    const cellH = (usableH - gap * (rows - 1)) / rows

    setImages((prev) =>
      prev.map((img, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)

        // Fit image into cell keeping aspect ratio
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
    )
  }, [images.length])

  // Delete selected image
  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setImages((prev) => prev.filter((img) => img.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  // Reset all
  const resetAll = useCallback(() => {
    setImages([])
    setSelectedId(null)
  }, [])

  // Touch / mouse drag and resize
  const dragInfo = useRef<{
    mode: "move" | "resize"
    imgId: string
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
  } | null>(null)

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      imgId: string,
      mode: "move" | "resize"
    ) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedId(imgId)

      const img = images.find((i) => i.id === imgId)
      if (!img) return

      dragInfo.current = {
        mode,
        imgId,
        startX: e.clientX,
        startY: e.clientY,
        origX: img.x,
        origY: img.y,
        origW: img.w,
        origH: img.h,
      }

      const handleMove = (ev: PointerEvent) => {
        if (!dragInfo.current) return
        const dx = (ev.clientX - dragInfo.current.startX) / displayScale
        const dy = (ev.clientY - dragInfo.current.startY) / displayScale

        setImages((prev) =>
          prev.map((img) => {
            if (img.id !== dragInfo.current!.imgId) return img
            if (dragInfo.current!.mode === "move") {
              return {
                ...img,
                x: Math.max(0, Math.min(A4_W - img.w, dragInfo.current!.origX + dx)),
                y: Math.max(0, Math.min(A4_H - img.h, dragInfo.current!.origY + dy)),
              }
            } else {
              // resize from corner, keep aspect ratio
              const ratio = dragInfo.current!.origW / dragInfo.current!.origH
              let newW = Math.max(30, dragInfo.current!.origW + dx)
              let newH = newW / ratio
              // Clamp to page bounds
              if (img.x + newW > A4_W) newW = A4_W - img.x
              newH = newW / ratio
              if (img.y + newH > A4_H) {
                newH = A4_H - img.y
                newW = newH * ratio
              }
              return { ...img, w: newW, h: newH }
            }
          })
        )
      }

      const handleUp = () => {
        dragInfo.current = null
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [images, displayScale]
  )

  // Convert to PDF
  const convertToPdf = useCallback(async () => {
    if (images.length === 0) return
    setConverting(true)
    try {
      const { PDFDocument } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([A4_W, A4_H])

      for (const img of images) {
        const res = await fetch(img.src)
        const buf = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)

        let pdfImage
        // Check if PNG
        if (
          img.src.startsWith("data:image/png") ||
          (bytes[0] === 0x89 && bytes[1] === 0x50)
        ) {
          pdfImage = await pdfDoc.embedPng(bytes)
        } else {
          // For everything else, draw to canvas as JPEG
          const canvas = document.createElement("canvas")
          canvas.width = Math.round(img.naturalW)
          canvas.height = Math.round(img.naturalH)
          const ctx = canvas.getContext("2d")!
          const htmlImg = new window.Image()
          htmlImg.crossOrigin = "anonymous"
          await new Promise<void>((resolve) => {
            htmlImg.onload = () => {
              ctx.drawImage(htmlImg, 0, 0)
              resolve()
            }
            htmlImg.src = img.src
          })
          const jpegBlob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
              "image/jpeg",
              0.92
            )
          )
          const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer())
          pdfImage = await pdfDoc.embedJpg(jpegBytes)
        }

        // pdf-lib Y axis is from bottom
        page.drawImage(pdfImage, {
          x: img.x,
          y: A4_H - img.y - img.h,
          width: img.w,
          height: img.h,
        })
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "images-to-pdf.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF conversion error:", err)
    } finally {
      setConverting(false)
    }
  }, [images])

  // Deselect on canvas click
  const handleCanvasClick = useCallback(() => {
    setSelectedId(null)
  }, [])

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
          onChange={(e) => handleFiles(e.target.files)}
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
      <div className="flex justify-center">
        <div
          ref={canvasRef}
          className="relative border-2 border-border bg-white shadow-lg"
          style={{
            width: displayW,
            height: displayH,
            touchAction: "none",
          }}
          onClick={handleCanvasClick}
        >
          {/* Grid lines (subtle) */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={displayW}
            height={displayH}
          >
            {/* Margin guides */}
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
              <p className="text-sm font-medium">Tap to add photos</p>
              <p className="text-xs">Place images on this A4 page</p>
            </button>
          )}

          {/* Placed images */}
          {images.map((img) => {
            const isSelected = selectedId === img.id
            return (
              <div
                key={img.id}
                className={`absolute cursor-grab select-none active:cursor-grabbing ${
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
                }}
                onPointerDown={(e) => handlePointerDown(e, img.id, "move")}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId(img.id)
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt="Placed"
                  className="pointer-events-none size-full object-fill"
                  draggable={false}
                />

                {/* Move indicator */}
                {isSelected && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow">
                    <Move className="inline size-3 mr-0.5" />
                    Drag
                  </div>
                )}

                {/* Resize handle - bottom right corner */}
                {isSelected && (
                  <div
                    className="absolute -bottom-2 -right-2 z-50 flex size-6 cursor-se-resize items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                    onPointerDown={(e) =>
                      handlePointerDown(e, img.id, "resize")
                    }
                  >
                    <Maximize2 className="size-3" />
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
