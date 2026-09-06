import sharp from "sharp"
import fs from "fs"

// Remove background using dominant-edge color detection with soft feathered alpha
export async function processImage(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata()
  
  // If image already has alpha with meaningful transparency, keep as-is (maybe trim)
  const hasAlpha = meta.hasAlpha
  
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  const { width, height, channels } = info
  
  // Sample edge pixels to detect background color
  const samplePixels = []
  const edgePixels = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x < 4 || y < 4 || x >= width - 4 || y >= height - 4
      if (isEdge) {
        const idx = (y * width + x) * channels
        samplePixels.push([data[idx], data[idx+1], data[idx+2]])
      }
    }
  }
  
  // Compute average background color
  let rSum = 0, gSum = 0, bSum = 0
  for (const [r, g, b] of samplePixels) {
    rSum += r; gSum += g; bSum += b
  }
  const n = samplePixels.length
  const bgR = rSum / n, bgG = gSum / n, bgB = bSum / n
  const bgLum = (bgR + bgG + bgB) / 3
  
  // Compute background variation (to detect uniform vs complex bg)
  let varSum = 0
  for (const [r, g, b] of samplePixels) {
    varSum += Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)
  }
  const bgVar = varSum / (n * 3)
  
  // Determine if background is light and uniform enough to remove
  const isLightBg = bgLum > 200
  const isUniformBg = bgVar < 25
  
  const out = Buffer.alloc(width * height * 4)
  let transparentCount = 0
  
  if (isLightBg && isUniformBg) {
    // Background-based removal (soft alpha)
    const t = Math.max(30, bgLum - 20)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels
        const outIdx = (y * width + x) * 4
        const r = data[idx], g = data[idx+1], b = data[idx+2]
        
        // Color distance from detected background
        const distBg = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
        
        let alpha = 255
        if (distBg < t) {
          alpha = Math.max(0, Math.round(255 - (t - distBg) * 30))
        }
        if (alpha < 128) transparentCount++
        
        out[outIdx] = r; out[outIdx+1] = g; out[outIdx+2] = b
        out[outIdx+3] = alpha
      }
    }
  } else {
    // Complex/dark background - keep alpha from source image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels
        const outIdx = (y * width + x) * 4
        out[outIdx] = data[idx]
        out[outIdx+1] = data[idx+1]
        out[outIdx+2] = data[idx+2]
        out[outIdx+3] = channels === 4 ? data[idx+3] : 255
        if (channels === 4 && data[idx+3] < 128) transparentCount++
      }
    }
  }
  
  // Trim empty borders and composite onto transparent canvas (centered square)
  const result = await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 })
    .png()
    .toBuffer()
  
  // Resize to 800x800 with padding, keep aspect ratio, center
  const finalBuffer = await sharp(result)
    .resize(800, 800, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  
  await sharp(Buffer.from(finalBuffer))
    .extend({
      top: 0, bottom: 0, left: 0, right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(outputPath)
  
  const transPct = Math.round((transparentCount / (width*height)) * 100)
  return { bgR: Math.round(bgR), bgG: Math.round(bgG), bgB: Math.round(bgB), bgLum: Math.round(bgLum), bgVar: Math.round(bgVar), isLightBg, isUniformBg, hadAlpha: hasAlpha, transparentPct: transPct }
}

export async function main() {
  // Test on a few real supabase front images
  const testSlugs = [
    "camara-dji-osmo-pocket-3-negro",
    "notebook-asus-vivobook-go-e1504fa-ab34-amd-ryzen-3-7320u-pantalla-full-hd-156-8gb-de-ram-256gb-ssd-win11home-ingles",
    "consola-sony-playstation-5-slim-cfi-2115-a01x-1tb-bivolt-blanco-americano",
    "auricular-jbl-wave-beam-2"
  ]
  
  const storage = "https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products"
  for (const slug of testSlugs) {
    const url = `${storage}/${slug}/front.png`
    try {
      const resp = await fetch(url)
      if (!resp.ok) { console.log(`\n${slug}: no front (${resp.status})`); continue }
      const buf = Buffer.from(await resp.arrayBuffer())
      fs.writeFileSync(`/tmp/input-${slug}.png`, buf)
      const info = await processImage(`/tmp/input-${slug}.png`, `/tmp/output-${slug}.png`)
      console.log(`\n${slug}:`, JSON.stringify(info))
      console.log(`  input: ${buf.length} bytes -> output: ${fs.statSync(`/tmp/output-${slug}.png`).size} bytes`)
    } catch(e) {
      console.log(`\n${slug}: ERROR ${e.message}`)
    }
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(e => console.error(e.message))
}
