import { PrismaClient } from "../src/generated/index.js"

const prisma = new PrismaClient({ datasourceUrl: "process.env.DATABASE_URL" })

async function main() {
  const count = await prisma.product.count()
  console.log(`✅ Conexión Prisma → Supabase OK`)
  console.log(`📊 Productos: ${count}`)
  
  const cats = await prisma.category.count()
  console.log(`📂 Categorías: ${cats}`)
  
  const sample = await prisma.product.findFirst({ select: { name: true, slug: true } })
  console.log(`🏷️  Muestra: ${sample?.name}`)
  
  await prisma.$disconnect()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
