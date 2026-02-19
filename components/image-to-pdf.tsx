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

function clamp(val: number, min: number, max: number) {
  if (!Number.isFinite(val)) return min
  return Math.max(min, Math.min(max, val))
}

export function ImageToPdf() {
  const [images, setImages] = useState<PlacedImage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Refs for latest state, avoiding stale closures
  const imagesRef = useRef<PlacedImage[]>(images)
  imagesRef.current = images

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

  // File handler
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
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
          w = Math.max(30, w)
          h = Math.max(30, h)

          const placed: PlacedImage = {
            id: uid(),
            src: reader.result as string,
            naturalW: imgEl.naturalWidth,
            naturalH: imgEl.naturalHeight,
            x: clamp((A4_W - w) / 2, 0, A4_W - w),
            y: clamp(40 + Math.random() * 100, 0, A4_H - h),
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

  // Auto grid
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
        const ratio = img.naturalH > 0 ? img.naturalW / img.naturalH : 1
        let w = cellW
        let h = w / ratio
        if (h > cellH) {
          h = cellH
          w = h * ratio
        }
        w = clamp(w, 30, usableW)
        h = clamp(h, 30, usableH)
        const x = padding + col * (cellW + gap) + (cellW - w) / 2
        const y = padding + row * (cellH + gap) + (cellH - h) / 2
        return { ...img, x: clamp(x, 0, A4_W - w), y: clamp(y, 0, A4_H - h), w, h }
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

  // ---- Drag / Resize system using refs only ----
  const dragRef = useRef<{
    mode: "move" | "resize"
    imgId: string
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
    ratio: number
  } | null>(null)

  const onPointerDownImage = useCallback(
    (e: React.PointerEvent, imgId: string, mode: "move" | "resize") => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedId(imgId)

      // Read directly from ref to get latest
      const img = imagesRef.current.find((i) => i.id === imgId)
      if (!img) return

      const ratio = img.h > 0 ? img.w / img.h : 1

      dragRef.current = {
        mode,
        imgId,
        startX: e.clientX,
        startY: e.clientY,
        origX: img.x,
        origY: img.y,
        origW: img.w,
        origH: img.h,
        ratio: Number.isFinite(ratio) ? ratio : 1,
      }
    },
    []
  )

  useEffect(() => {
    function onMove(ev: PointerEvent) {
      const d = dragRef.current
      if (!d) return

      ev.preventDefault()
      const scale = displayScaleRef.current || 1
      const dx = (ev.clientX - d.startX) / scale
      const dy = (ev.clientY - d.startY) / scale

      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== d.imgId) return img
          if (d.mode === "move") {
            return {
              ...img,
              x: clamp(d.origX + dx, 0, A4_W - img.w),
              y: clamp(d.origY + dy, 0, A4_H - img.h),
            }
          } else {
            // Resize: aspect-ratio locked
            const r = d.ratio || 1
            let newW = clamp(d.origW + dx, 30, A4_W)
            let newH = newW / r
            // Clamp within page
            if (img.x + newW > A4_W) {
              newW = A4_W - img.x
              newH = newW / r
            }
            if (img.y + newH > A4_H) {
              newH = A4_H - img.y
              newW = newH * r
            }
            newW = clamp(newW, 30, A4_W - img.x)
            newH = clamp(newH, 30, A4_H - img.y)
            return { ...img, w: newW, h: newH }
          }
        })
      )
    }

    function onUp() {
      dragRef.current = null
    }

    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
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
      console.error("PDF conversion error:", err)
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
          ref={canvasRef}
          className="relative border-2 border-border bg-white shadow-lg"
          style={{
            width: displayW,
            height: displayH,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onPointerDown={() => setSelectedId(null)}
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
              <p className="text-sm font-medium text-foreground/60">
                Tap to add photos
              </p>
              <p className="text-xs text-foreground/40">
                Place images on this A4 page
              </p>
            </button>
          )}

          {/* Placed images */}
          {images.map((img) => {
            const isSelected = selectedId === img.id
            const left = clamp(img.x * displayScale, 0, displayW)
            const top = clamp(img.y * displayScale, 0, displayH)
            const w = clamp(img.w * displayScale, 10, displayW)
            const h = clamp(img.h * displayScale, 10, displayH)

            return (
              <div
                key={img.id}
                className={`absolute select-none ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-1"
                    : "ring-0 hover:ring-1 hover:ring-primary/30"
                }`}
                style={{
                  left,
                  top,
                  width: w,
                  height: h,
                  touchAction: "none",
                  zIndex: isSelected ? 50 : 1,
                  cursor: isSelected ? "grab" : "pointer",
                }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPointerDownImage(e, img.id, "move")
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
                    className="absolute -bottom-2.5 -right-2.5 z-[60] flex size-7 cursor-se-resize items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      onPointerDownImage(e, img.id, "resize")
                    }}
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
          : `${images.length} photo${images.length > 1 ? "s" : ""} placed. Tap to select, drag to move, corner to resize.`}
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
