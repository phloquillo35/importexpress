import { PrismaClient } from '../src/generated/client.js'
async function main() {
  const p = new PrismaClient()
  try {
    const total = await p.product.count({ where: { deletedAt: null } })
    const conEnvio = await p.product.count({ where: { deletedAt: null, freeShipping: true } })
    const sinEnvio = await p.product.count({ where: { deletedAt: null, freeShipping: false } })
    console.log(JSON.stringify({ total, conEnvio, sinEnvio }))
  } finally {
    await p.$disconnect()
  }
}
main()
