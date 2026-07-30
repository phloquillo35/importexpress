import { defineConfig } from 'prisma/config'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@prisma/adapter-neon'

const config = defineConfig({
  datasource: {
    url: process.env.DATABASE_URL
  }
})

const p = new PrismaClient()
try {
  const total = await p.product.count({ where: { deletedAt: null } })
  const conEnvio = await p.product.count({ where: { deletedAt: null, freeShipping: true } })
  const sinEnvio = await p.product.count({ where: { deletedAt: null, freeShipping: false } })
  console.log(JSON.stringify({ total, conEnvio, sinEnvio }))
} finally {
  await p.$disconnect()
}
