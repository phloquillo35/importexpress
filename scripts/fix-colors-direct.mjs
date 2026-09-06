import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const raw = fs.readFileSync(".env","utf-8")
const get = k => { const m = raw.split("\n").find(l=>l.startsWith(k+"=")); return m?m.split("=").slice(1).join("=").replace(/^[\"']|[\"']$/g,''):"" }
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL")
const SUPABASE_SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY")
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

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

// Fix DualSense
const newDualsenseImages = [
  { url: dualsenseURLs[""], color: "blanco" },
  { url: dualsenseURLs["morado"], color: "morado" },
  { url: dualsenseURLs["techno rojo"], color: "techno rojo" },
  { url: dualsenseURLs["starlight azul"], color: "starlight azul" },
  { url: dualsenseURLs["chroma pearl"], color: "chroma pearl" },
  { url: dualsenseURLs["camuflado gris"], color: "camuflado gris" },
  { url: dualsenseURLs["remix verde"], color: "remix verde" },
]

const dualsenseJSON = JSON.stringify(newDualsenseImages)

const { error: e1 } = await sb.from('product').update({ images: dualsenseJSON }).eq('slug', 'control-sony-dualsense-para-ps5-cfi-zct2w')
if (e1) { console.error('DualSense error:', e1.message) }
else console.log('DualSense updated OK')

// Fix GameSir
const newGamesirImages = [
  { url: gamesirURLs["blanco"], color: "blanco" },
  { url: gamesirURLs["azul"], color: "azul" },
  { url: gamesirURLs["naranja"], color: "naranja" },
  { url: gamesirURLs["rosa"], color: "rosa" },
]

const gamesirJSON = JSON.stringify(newGamesirImages)

const { error: e3 } = await sb.from('product').update({ images: gamesirJSON }).eq('slug', 'control-gamesir-g7-se-para-xbox-series-')
if (err2) console.error('GameSir error:', e2.message)
else console.log('GameSir updated OK')

console.log('DONE')