import sharp from "sharp"
import fs from "fs"

async function removeWhiteBackground(inputPath, outputPath, opts = {}) {
  const { threshold = 235, feather = 2 } = opts
  // Process: convert to RGBA, set near-white pixels to transparent using a soft threshold
  const image = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  const { data, info } = image
  const { width, height, channels } = info
  
  const out = Buffer.alloc(width * height * 4)
  
  // Compute dominant background by sampling edges
  let edgeWhite = 0, edgeTotal = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
                     x < 3 || y < 3 || x > width - 4 || y > height - 4
      if (isEdge) {
        const idx = (y * width + x) * channels
        const r = data[idx], g = data[idx+1], b = data[idx+2]
        const lum = (r + g + b) / 3
        edgeWhite += lum
        edgeTotal++
      }
    }
  }
  const bgLum = edgeWhite / edgeTotal
  
  // Threshold derived from background
  const t = Math.min(threshold, bgLum - 15)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const r = data[idx], g = data[idx+1], b = data[idx+2]
      const inIdx = (y * width + x) * 4
      
      // Distance from white
      const distFromWhite = Math.sqrt((255-r)*(255-r) + (255-g)*(255-g) + (255-b)*(255-b))
      
      // alpha based on distance (smooth transition)
      let alpha
      if (distFromWhite < t) {
        // Very close to white - transparent proportional
        alpha = Math.max(0, 255 - (t - distFromWhite) * 30)
      } else {
        alpha = 255
      }
      
      out[inIdx] = r
      out[inIdx+1] = g
      out[inIdx+2] = b
      out[inIdx+3] = alpha
    }
  }
  
  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 })
    .png()
    .toFile(outputPath)
}

async function main() {
  const inputUrl = "https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products/camara-dji-osmo-pocket-3-negro/front.png"
  const resp = await fetch(inputUrl)
  const buf = Buffer.from(await resp.arrayBuffer())
  fs.writeFileSync("/tmp/input-test.png", buf)
  console.log("Downloaded", buf.length, "bytes")
  
  await removeWhiteBackground("/tmp/input-test.png", "/tmp/output-test.png")
  console.log("Done! Output saved to /tmp/output-test.png")
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1) })
