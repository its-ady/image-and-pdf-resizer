"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, ImageIcon, FileText } from "lucide-react"

interface UploadZoneProps {
  accept: string
  label: string
  icon: "image" | "pdf"
  onFileSelect: (file: File) => void
}

export function UploadZone({ accept, label, icon, onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFileSelect(file)
    },
    [onFileSelect]
  )

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  const IconComponent = icon === "image" ? ImageIcon : FileText

  return (
    <button
      type="button"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        group w-full cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all
        ${
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-label={label}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
          <IconComponent className="size-7" />
        </div>
        <div>
          <p className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap to upload or drag & drop
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          <Upload className="size-3.5" />
          Browse Files
        </div>
      </div>
    </button>
  )
}
