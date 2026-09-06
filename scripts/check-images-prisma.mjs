import { PrismaClient } from "../src/generated/index.js"

const prisma = new PrismaClient({ datasourceUrl: "process.env.DATABASE_URL" })

async function main() {
  const product = await prisma.product.findFirst({
    where: { slug: "pedalera-valeton-gp200" },
    select: { name: true, images: true }
  })
  console.log("Product:", product?.name)
  console.log("Images:", JSON.stringify(product?.images))
  
  const count = await prisma.product.count()
  console.log("Total products:", count)
  
  const withImages = await prisma.product.count({
    where: { images: { not: null } }
  })
  console.log("With images:", withImages)
  
  await prisma.$disconnect()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
