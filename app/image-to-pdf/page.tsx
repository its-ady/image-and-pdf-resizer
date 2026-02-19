import { Metadata } from "next"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ImageToPdf } from "@/components/image-to-pdf"

export const metadata: Metadata = {
  title: "Image to PDF - Image & PDF Resizer",
  description:
    "Arrange multiple photos on an A4 page and convert to PDF. Drag, resize, and auto-grid your images.",
}

export default function ImageToPdfPage() {
  return (
    <div className="min-h-dvh bg-background">
      <ToolPageHeader title="Image to PDF" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground">
            Arrange Photos on A4 Page
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Add photos, drag to position, resize from corners, then convert to PDF.
          </p>
        </div>
        <ImageToPdf />
      </main>
    </div>
  )
}
