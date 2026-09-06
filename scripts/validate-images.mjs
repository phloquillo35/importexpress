import { imageMap } from "./image-map.mjs"

async function validate(url) {
  try {
    const resp = await fetch(url, { method: "GET", redirect: "follow" })
    if (!resp.ok) return { ok: false, status: resp.status, reason: "HTTP " + resp.status }
    const buf = Buffer.from(await resp.arrayBuffer())
    // Check magic bytes for image types
    const magic = buf.slice(0, 12).toString("hex")
    const isPng = magic.startsWith("89504e47")
    const isJpeg = magic.startsWith("ffd8ff") || magic.startsWith("ffd8")
    const isGif = magic.startsWith("474946")
    const isWebp = magic.slice(0, 16) === "52494646" // RIFF...WEBP
    const isImg = isPng || isJpeg || isGif || isWebp
    const ct = resp.headers.get("content-type") || ""
    if (!isImg && !/image\//.test(ct)) {
      return { ok: false, status: resp.status, reason: `Not an image (${buf.length}B, ct=${ct}, magic=${magic.slice(0,8)})` }
    }
    return { ok: true, status: resp.status, bytes: buf.length, type: isPng?"PNG":isJpeg?"JPEG":isWebp?"WebP":"other" }
  } catch (e) {
    return { ok: false, status: -1, reason: e.message }
  }
}

const results = []
for (const [slug, url] of Object.entries(imageMap)) {
  const r = await validate(url)
  results.push({ slug, url, ...r })
  console.log(`${r.ok ? "OK " : "FAIL"} ${slug}`)
  if (!r.ok) console.log(`     ${url}\n     -> ${r.reason}`)
}
const okCount = results.filter(r => r.ok).length
console.log(`\nVALID: ${okCount}/${results.length}`)
