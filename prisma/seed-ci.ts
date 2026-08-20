import { PrismaClient } from "../src/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { randomUUID } from "crypto"
import { hashSync } from "bcryptjs"
import { calculateFinalPrice } from "../src/lib/pricing"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL no está definida. Abortando seed de CI.")
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: databaseUrl })),
})

const EXCHANGE_RATE = 1350
const PROFIT_VALUE = 20
const PROFIT_TYPE = "percentage"

interface SeedProduct {
  name: string
  slug: string
  costUSDT: number
  stock: number
}

const PRODUCTS: SeedProduct[] = [
  { name: "Auriculares Bluetooth Pro", slug: "auriculares-bluetooth-pro", costUSDT: 50, stock: 10 },
  { name: "Smartwatch Fit X100", slug: "smartwatch-fit-x100", costUSDT: 30, stock: 15 },
  { name: "Parlante Bluetooth Mini", slug: "parlante-bluetooth-mini", costUSDT: 20, stock: 20 },
  { name: "Tablet T-200", slug: "tablet-t-200", costUSDT: 80, stock: 8 },
  { name: "Cargador GaN 65W", slug: "cargador-gan-65w", costUSDT: 15, stock: 25 },
  { name: "Cable USB-C 1m", slug: "cable-usb-c-1m", costUSDT: 5, stock: 50 },
  { name: "Mouse Inalámbrico", slug: "mouse-inalambrico", costUSDT: 12, stock: 30 },
  { name: "Teclado Bluetooth", slug: "teclado-bluetooth", costUSDT: 25, stock: 18 },
  { name: "Funda iPhone 15", slug: "funda-iphone-15", costUSDT: 8, stock: 40 },
  { name: "Power Bank 20000mAh", slug: "power-bank-20000mah", costUSDT: 35, stock: 12 },
  { name: "Drone Mini Pro", slug: "drone-mini-pro", costUSDT: 120, stock: 6 },
  { name: "Cámara Web 1080p", slug: "camara-web-1080p", costUSDT: 28, stock: 14 },
  { name: "Micrófono USB", slug: "microfono-usb", costUSDT: 40, stock: 9 },
  { name: "Soporte Notebook", slug: "soporte-notebook", costUSDT: 18, stock: 22 },
  { name: "Lámpara LED", slug: "lampara-led", costUSDT: 10, stock: 35 },
]

async function main() {
  await prisma.admin.upsert({
    where: { email: "lopedislotenes@admin.com" },
    update: {},
    create: {
      id: randomUUID(),
      email: "lopedislotenes@admin.com",
      name: "Admin",
      password: hashSync("elpiratad", 10),
    },
  })
  console.log("Admin listo: lopedislotenes@admin.com")

  const settings = [
    { key: "exchange_rate", value: String(EXCHANGE_RATE) },
    { key: "business_name", value: "Lo Pedís, Lo Tenes" },
    { key: "whatsapp", value: "5491123456789" },
    { key: "instagram", value: "@lopedis_lotenes.01" },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { id: s.key, key: s.key, value: s.value },
    })
  }
  console.log(`Settings listos (exchange_rate=${EXCHANGE_RATE})`)

  const category = await prisma.category.upsert({
    where: { slug: "electronica" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Electrónica",
      slug: "electronica",
      description: "Celulares, tablets, audífonos y accesorios",
    },
  })
  console.log(`Categoría lista: ${category.name}`)

  for (const p of PRODUCTS) {
    const pricing = calculateFinalPrice({
      costUSDT: p.costUSDT,
      yoniEnabled: false,
      yoniType: "percentage",
      yoniValue: 0,
      shippingCost: 0,
      profitType: PROFIT_TYPE,
      profitValue: PROFIT_VALUE,
      exchangeRate: EXCHANGE_RATE,
      usdtRate: EXCHANGE_RATE,
    })

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        priceUSD: pricing.finalPriceUSD,
        priceARS: pricing.finalPriceARS,
        costUSD: p.costUSDT,
        costUSDT: p.costUSDT,
        finalPriceUSD: pricing.finalPriceUSD,
        finalPriceARS: pricing.finalPriceARS,
        subtotalARS: pricing.subtotalARS,
        profitARS: pricing.profitARS,
        profitType: PROFIT_TYPE,
        profitValue: PROFIT_VALUE,
        stock: p.stock,
        isAvailable: true,
        isFeatured: true,
        categoryId: category.id,
      },
      create: {
        id: randomUUID(),
        name: p.name,
        slug: p.slug,
        description: p.name,
        images: [],
        priceUSD: pricing.finalPriceUSD,
        priceARS: pricing.finalPriceARS,
        costUSD: p.costUSDT,
        costUSDT: p.costUSDT,
        yoniEnabled: false,
        yoniType: "percentage",
        yoniValue: 0,
        hasFinancing: false,
        shippingCost: 0,
        profitType: PROFIT_TYPE,
        profitValue: PROFIT_VALUE,
        finalPriceUSD: pricing.finalPriceUSD,
        finalPriceARS: pricing.finalPriceARS,
        subtotalARS: pricing.subtotalARS,
        profitARS: pricing.profitARS,
        stock: p.stock,
        minStock: 5,
        isAvailable: true,
        isFeatured: true,
        freeShipping: false,
        categoryId: category.id,
      },
    })
    console.log(
      `Producto listo: ${p.name} (USD ${pricing.finalPriceUSD} / ARS ${pricing.finalPriceARS})`
    )
  }

  console.log("Seed de CI completado sin errores.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })