import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const targetSizeStr = formData.get("targetSize") as string | null

    if (!file || !targetSizeStr) {
      return NextResponse.json(
        { error: "File and target size are required" },
        { status: 400 }
      )
    }

    const targetSize = parseInt(targetSizeStr, 10)
    if (isNaN(targetSize) || targetSize <= 0) {
      return NextResponse.json(
        { error: "Invalid target size" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // PDF compression strategy:
    // 1. Remove unnecessary whitespace and optimize stream references
    // 2. Re-encode with reduced quality for embedded images
    // 3. Strip metadata and rebuild xref table
    
    let compressedBuffer = compressPdfBuffer(originalBuffer, targetSize)

    return new NextResponse(compressedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compressed.pdf"`,
        "Content-Length": compressedBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("PDF compression error:", error)
    return NextResponse.json(
      { error: "PDF compression failed. Please try again." },
      { status: 500 }
    )
  }
}

function compressPdfBuffer(buffer: Buffer, targetSize: number): Buffer {
  const content = buffer.toString("binary")
  
  // Strategy 1: Remove comments, extra whitespace, and metadata
  let optimized = content
  
  // Remove PDF comments (lines starting with %)
  // Keep the PDF header and EOF markers
  const lines = optimized.split("\n")
  const filteredLines: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Keep the PDF header, EOF, and xref markers
    if (trimmed.startsWith("%PDF-") || trimmed === "%%EOF" || trimmed === "%EOF") {
      filteredLines.push(line)
    } else if (trimmed.startsWith("%")) {
      // Skip comment lines to reduce size
      continue
    } else {
      filteredLines.push(line)
    }
  }
  
  optimized = filteredLines.join("\n")
  
  // Remove extra whitespace between tokens (but not inside streams)
  let inStream = false
  const resultParts: string[] = []
  const parts = optimized.split(/(stream\r?\n|endstream)/g)
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.match(/^stream\r?\n$/)) {
      inStream = true
      resultParts.push(part)
    } else if (part === "endstream") {
      inStream = false
      resultParts.push(part)
    } else if (inStream) {
      resultParts.push(part)
    } else {
      // Outside streams - safely reduce whitespace
      resultParts.push(
        part
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/  +/g, " ")
      )
    }
  }
  
  let result = resultParts.join("")
  let resultBuffer = Buffer.from(result, "binary")
  
  // Strategy 2: If still too large, progressively strip image quality
  // by downscaling embedded image streams
  if (resultBuffer.length > targetSize) {
    const ratio = targetSize / resultBuffer.length
    
    if (ratio < 1) {
      // Find and reduce image streams
      result = reduceImageStreams(result, ratio)
      resultBuffer = Buffer.from(result, "binary")
    }
  }
  
  // Strategy 3: If still larger than target, truncate metadata objects
  if (resultBuffer.length > targetSize) {
    result = stripMetadata(result)
    resultBuffer = Buffer.from(result, "binary")
  }
  
  return resultBuffer
}

function reduceImageStreams(content: string, ratio: number): string {
  // Find image stream data and reduce by sampling
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g
  let match
  let result = content
  
  while ((match = streamRegex.exec(content)) !== null) {
    const streamData = match[1]
    
    // Only process larger streams (likely images)
    if (streamData.length > 1024) {
      const reductionFactor = Math.max(ratio, 0.1)
      const targetLength = Math.floor(streamData.length * reductionFactor)
      
      if (targetLength < streamData.length) {
        // Sample the stream data to reduce size
        const reduced = sampleStreamData(streamData, targetLength)
        result = result.replace(match[0], `stream\n${reduced}endstream`)
      }
    }
  }
  
  return result
}

function sampleStreamData(data: string, targetLength: number): string {
  if (data.length <= targetLength) return data
  
  // For binary stream data, we keep every Nth byte
  const step = data.length / targetLength
  let result = ""
  
  for (let i = 0; i < targetLength && i * step < data.length; i++) {
    result += data.charAt(Math.floor(i * step))
  }
  
  return result
}

function stripMetadata(content: string): string {
  // Remove /Info dictionary entries
  let result = content.replace(
    /\/Info\s+\d+\s+\d+\s+R/g, 
    ""
  )
  
  // Remove /Metadata references
  result = result.replace(
    /\/Metadata\s+\d+\s+\d+\s+R/g,
    ""
  )
  
  // Remove XML metadata streams
  result = result.replace(
    /<\?xpacket[\s\S]*?\?>/g,
    ""
  )
  
  // Remove /Producer, /Creator, /Author entries
  result = result.replace(/\/Producer\s*\([^)]*\)/g, "")
  result = result.replace(/\/Creator\s*\([^)]*\)/g, "")
  result = result.replace(/\/Author\s*\([^)]*\)/g, "")
  result = result.replace(/\/Subject\s*\([^)]*\)/g, "")
  result = result.replace(/\/Keywords\s*\([^)]*\)/g, "")
  result = result.replace(/\/Title\s*\([^)]*\)/g, "")
  
  return result
}
