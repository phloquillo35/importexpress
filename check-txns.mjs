import { PrismaClient } from './src/generated/client/index.js'
const prisma = new PrismaClient()

async function main() {
  const txns = await prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 100 })
  console.log('Total txns:', txns.length)
  txns.forEach(t => console.log(t.date, t.type, t.amountUSD, t.concept?.substring(0,30)))
  const oldest = await prisma.transaction.findFirst({ orderBy: { date: 'asc' } })
  console.log('Oldest txn:', oldest?.date)
  const orders = await prisma.order.findMany({ where: { deletedAt: null }, take: 5, orderBy: { createdAt: 'desc' } })
  console.log('Recent orders:', orders.length)
  orders.forEach(o => console.log(o.createdAt, o.clientName, o.totalUSD))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
