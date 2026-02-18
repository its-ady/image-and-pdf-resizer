import Image from "next/image"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="relative size-9 shrink-0 overflow-hidden rounded-lg shadow-sm">
          <Image
            src="/logo.jpg"
            alt="Image & PDF Resizer logo"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col">
          <h1 className="font-[family-name:var(--font-heading)] text-base font-bold leading-tight text-foreground">
            Image & PDF Resizer
          </h1>
          <p className="text-xs text-muted-foreground">
            Compress files to any size
          </p>
        </div>
      </div>
    </header>
  )
}
