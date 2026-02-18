"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SizeSelectorProps {
  onSizeSelect: (sizeInBytes: number) => void
  selectedSize: number | null
}

const PRESET_SIZES = [
  { label: "30 KB", bytes: 30 * 1024 },
  { label: "50 KB", bytes: 50 * 1024 },
  { label: "100 KB", bytes: 100 * 1024 },
  { label: "200 KB", bytes: 200 * 1024 },
  { label: "500 KB", bytes: 500 * 1024 },
  { label: "1 MB", bytes: 1024 * 1024 },
  { label: "2 MB", bytes: 2 * 1024 * 1024 },
]

export function SizeSelector({ onSizeSelect, selectedSize }: SizeSelectorProps) {
  const [customValue, setCustomValue] = useState("")
  const [customUnit, setCustomUnit] = useState<"KB" | "MB">("KB")
  const [isCustom, setIsCustom] = useState(false)

  const handlePresetClick = (bytes: number) => {
    setIsCustom(false)
    setCustomValue("")
    onSizeSelect(bytes)
  }

  const handleCustomChange = (value: string) => {
    setCustomValue(value)
    setIsCustom(true)
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      const bytes = customUnit === "MB" ? num * 1024 * 1024 : num * 1024
      onSizeSelect(bytes)
    }
  }

  const handleUnitToggle = () => {
    const newUnit = customUnit === "KB" ? "MB" : "KB"
    setCustomUnit(newUnit)
    if (customValue) {
      const num = parseFloat(customValue)
      if (!isNaN(num) && num > 0) {
        const bytes = newUnit === "MB" ? num * 1024 * 1024 : num * 1024
        onSizeSelect(bytes)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Label className="font-[family-name:var(--font-heading)] text-sm font-semibold text-foreground">
        Select Target Size
      </Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_SIZES.map((size) => (
          <button
            key={size.label}
            type="button"
            onClick={() => handlePresetClick(size.bytes)}
            className={`
              rounded-lg px-3.5 py-2 text-sm font-medium transition-all
              ${
                !isCustom && selectedSize === size.bytes
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"
              }
            `}
          >
            {size.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Or enter custom size</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Enter size..."
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            min={1}
            className={`flex-1 ${isCustom && customValue ? "border-primary ring-1 ring-primary/30" : ""}`}
          />
          <button
            type="button"
            onClick={handleUnitToggle}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-primary/10"
          >
            {customUnit}
          </button>
        </div>
      </div>
    </div>
  )
}
