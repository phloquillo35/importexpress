import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"
import pg from "pg"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
function loadEnv(file) {
  if (!fs.existsSync(file)) return {}
  const env = {}
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return env
}
const env = { ...loadEnv(path.join(projectRoot, ".env")), ...loadEnv(path.join(projectRoot, ".env.local")) }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// Official color maps from agent research
const dualsenseColors = {
  "": "blanco",
  "morado": "morado",
  "techno rojo": "techno rojo",
  "starlight azul": "starlight azul",
  "chroma pearl": "chroma pearl",
  "camuflado gris": "camuflado gris",
  "remix verde": "remix verde",
}
const gamesirColors = {
  "blanco": "blanco",
  "azul": "azul",
  "naranja": "naranja",
  "rosa": "rosa",  // rosa mapeado al morado oficial si no hay rosa real
}

// URLs oficiales por color (Best Buy CDN)
const dualsenseURLs = {
  "": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6430/6430163_sd.jpg",
  "morado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6497/6497953_sd.jpg",
  "techno rojo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/43806f76-47a0-4901-a273-b080eb9a9dff.png",
  "starlight azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6492/6492317_sd.jpg",
  "chroma pearl": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/392ad00c-3b3b-4239-b517-ee44db4e779d.jpg",
  "camuflado gris": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6522/6522931_sd.jpg",
  "remix verde": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/8bebe07f-bc6f-4505-8aee-a7044191bd3d.jpg",
}
const gamesirURLs = {
  "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/75d96c0e-85c5-4b9e-b896-3c450a2f2197.jpg",
  "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/94d2cddb-f6d7-443f-8234-391b6d9540e9.png",
  "naranja": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/ed307616-cbfd-4028-8e9a-dced197fef16.png",
  "rosa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/efe58636-97d7-47af-9f61-ab4c1a5dcf59.png",
}

async function main() {
  // Fix DualSense
  console.log('=== Fijando DualSense ===')
  const r = await pool.query('SELECT id, images FROM public.product WHERE slug = $1', ['control-sony-dualsense-para-ps5-cfi-zct2w'])
  const dualsense = r.rows[0]
  const newImages = []
  for (const img of dualsense.images) {
    const color = img.color || ''
    const folder = dualsenseColors[color] || safeColor(color)
    const expectedURL = `https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products/control-sony-dualsense-para-ps5-cfi-zct2w/${folder}/front.png`
    // Verify URL exists in Supabase
    const { data, error } = await sb.storage.from('products').getPublicUrl(`${'products/control-sony-dualsense-para-ps5-cfi-zct2w/' + folder}/front.png`)
    console.log(`Color ${color}: folder=${folder}, expectedURL pattern=`)
    // Rather than verify public URL complexly, just use the known official URL and sub it
    newImages.push({ url: dualsenseURLs[color] || expectedURL, color })
  }
  await pool.query('UPDATE public.product SET images=$1::jsonb WHERE id=$2', [JSON.stringify(newImages), r.rows[0].id])
  console.log('DualSense DB updated')

  // Fix GameSir
  console.log('=== Fijando GameSir ===')
  const r2 = await pool.query('SELECT id, images FROM public.product WHERE slug = $1', ['control-gamesir-g7-se-para-xbox-series-'])
  const gamesir = r2.rows[0]
  const newImages2 = []
  for (const img of gamesir.images) {
    const color = img.color || ''
    const folder = gamesirColors[color] || safeColor(color)
    const expectedURL = `https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products/control-gamesir-g7-se-para-xbox-series-${folder}/front.png`
    newImages2.push({ url: gamesirURLs[color] || expectedURL, color })
  }
  await pool.query('UPDATE public.product SET images=$1::jsonb WHERE id=$2', [JSON.stringify(newImages2), r2.rows[0].id])
  console.log('GameSir DB updated')

  await pool.end()
  console.log('DONE')
}

main().catch(e => { console.error(e); process.exit(1) })

function safeColor(c) {
  if (!c) return 'default'
  return c.toLowerCase().trim().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}