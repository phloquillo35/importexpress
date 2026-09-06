import { removeBackground } from "@imgly/background-removal"
import fs from "fs"

async function main() {
  const inputUrl = "https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products/camara-dji-osmo-pocket-3-negro/front.png"
  console.log("Downloading image...")
  const resp = await fetch(inputUrl)
  const buf = await resp.arrayBuffer()
  console.log("Downloaded", buf.byteLength, "bytes")
  fs.writeFileSync("/tmp/front-input.png", Buffer.from(buf))

  console.log("Removing background...")
  const result = await removeBackground(Buffer.from(buf), {
    publicPath: "file:///tmp/bgr-data/package/dist/",
    output: { format: "image/png", quality: 1.0 },
    progress: (key, current, total) => {
      if (total > 0) console.log(`  ${key}: ${Math.round((current/total)*100)}%`)
    }
  })
  
  // result is a Blob
  const out = Buffer.from(await result.arrayBuffer())
  fs.writeFileSync("/tmp/front-nobg.png", out)
  console.log("Output size:", out.length, "bytes")
}

main().catch(e => { console.error("ERROR:", e.message, e.stack); process.exit(1) })
