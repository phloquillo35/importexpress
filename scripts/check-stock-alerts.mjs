#!/usr/bin/env node
/**
 * Stock Alerts Checker Script
 * 
 * Verifica productos con stock <= minStock y genera reporte.
 * Uso: npx tsx scripts/check-stock-alerts.mjs [--json] [--threshold=N]
 * 
 * Exit codes:
 *   0 = OK (no alerts or alerts found but script ran successfully)
 *   1 = Error (DB connection, query failed)
 *   2 = Alerts found (when --fail-on-alerts is used)
 */

import { PrismaClient } from "@/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({ 
  connectionString: "process.env.DATABASE_URL" 
})
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
})

/**
 * @typedef {Object} StockAlert
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {number} stock
 * @property {number} minStock
 * @property {boolean} isAvailable
 * @property {string|null} category
 * @property {number} deficit
 * @property {"critical"|"warning"|"info"} severity
 */

/**
 * @typedef {Object} CheckResult
 * @property {string} timestamp
 * @property {number} totalProducts
 * @property {number} alertsCount
 * @property {number} criticalCount
 * @property {number} warningCount
 * @property {number} infoCount
 * @property {StockAlert[]} alerts
 */

function calculateSeverity(stock, minStock) {
  if (stock <= 0) return "critical"
  if (stock <= Math.floor(minStock * 0.5)) return "critical"
  if (stock <= minStock) return "warning"
  return "info"
}

async function checkStockAlerts(thresholdMultiplier = 1) {
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      stock: true,
      minStock: true,
      isAvailable: true,
      category: {
        select: { name: true }
      }
    },
    orderBy: { stock: "asc" }
  })

  const alerts = products
    .filter(p => p.stock <= p.minStock * thresholdMultiplier)
    .map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.stock,
      minStock: p.minStock,
      isAvailable: p.isAvailable,
      category: p.category?.name ?? null,
      deficit: p.minStock - p.stock,
      severity: calculateSeverity(p.stock, p.minStock)
    }))
    .sort((a, b) => {
      // Sort by severity: critical first, then by deficit
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return b.deficit - a.deficit
    })

  const criticalCount = alerts.filter(a => a.severity === "critical").length
  const warningCount = alerts.filter(a => a.severity === "warning").length
  const infoCount = alerts.filter(a => a.severity === "info").length

  return {
    timestamp: new Date().toISOString(),
    totalProducts: products.length,
    alertsCount: alerts.length,
    criticalCount,
    warningCount,
    infoCount,
    alerts
  }
}

function printHumanReadable(result) {
  console.log("\n═══════════════════════════════════════════════")
  console.log("  📦 STOCK ALERTS REPORT")
  console.log("═══════════════════════════════════════════════")
  console.log(`  Timestamp: ${result.timestamp}`)
  console.log(`  Total Products: ${result.totalProducts}`)
  console.log(`  Alerts Found: ${result.alertsCount}`)
  console.log(`    🔴 Critical: ${result.criticalCount}`)
  console.log(`    🟡 Warning:  ${result.warningCount}`)
  console.log(`    🔵 Info:     ${result.infoCount}`)
  console.log("═══════════════════════════════════════════════\n")

  if (result.alerts.length === 0) {
    console.log("  ✅ No hay productos con stock bajo o crítico.")
    return
  }

  console.log("  PRODUCTOS CON ALERTA:\n")
  
  for (const alert of result.alerts) {
    const severityIcon = alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵"
    const stockStr = alert.stock <= 0 ? "SIN STOCK" : `${alert.stock} / ${alert.minStock}`
    const categoryStr = alert.category ? ` [${alert.category}]` : ""
    
    console.log(`  ${severityIcon} ${alert.name}${categoryStr}`)
    console.log(`     Stock: ${stockStr}  |  Déficit: ${alert.deficit}  |  Slug: ${alert.slug}`)
    console.log("")
  }

  console.log("═══════════════════════════════════════════════")
  console.log("  ACCIONES RECOMENDADAS:")
  console.log("═══════════════════════════════════════════════")
  
  const critical = result.alerts.filter(a => a.severity === "critical")
  if (critical.length > 0) {
    console.log(`  🔴 ${critical.length} producto(s) CRÍTICOS - Reordenar URGENTE`)
    for (const p of critical.slice(0, 5)) {
      console.log(`     - ${p.name} (stock: ${p.stock}, min: ${p.minStock})`)
    }
    if (critical.length > 5) console.log(`     ... y ${critical.length - 5} más`)
  }
  
  const warning = result.alerts.filter(a => a.severity === "warning")
  if (warning.length > 0) {
    console.log(`  🟡 ${warning.length} producto(s) en WARNING - Planificar reorden`)
  }
}

function printJSON(result) {
  console.log(JSON.stringify(result, null, 2))
}

async function main() {
  const args = process.argv.slice(2)
  const asJson = args.includes("--json")
  const thresholdArg = args.find(a => a.startsWith("--threshold="))
  const threshold = thresholdArg ? parseFloat(thresholdArg.split("=")[1]) : 1

  if (isNaN(threshold) || threshold <= 0) {
    console.error("Error: --threshold debe ser un número positivo")
    process.exit(1)
  }

  try {
    const result = await checkStockAlerts(threshold)
    
    if (asJson) {
      printJSON(result)
    } else {
      printHumanReadable(result)
    }

    // Exit with 0 even if alerts found - script succeeded
    // Use --fail-on-alerts if you want non-zero exit on alerts
    if (args.includes("--fail-on-alerts") && result.alertsCount > 0) {
      process.exit(2)
    }
    
    process.exit(0)
  } catch (error) {
    console.error("❌ Error checking stock alerts:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()