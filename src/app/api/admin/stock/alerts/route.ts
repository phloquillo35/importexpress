import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

interface StockAlert {
  id: string
  name: string
  slug: string
  stock: number
  minStock: number
  isAvailable: boolean
  category: string | null
  deficit: number
  severity: "critical" | "warning" | "info"
}

interface AlertsResponse {
  timestamp: string
  totalProducts: number
  alertsCount: number
  criticalCount: number
  warningCount: number
  infoCount: number
  alerts: StockAlert[]
}

function calculateSeverity(stock: number, minStock: number): "critical" | "warning" | "info" {
  if (stock <= 0) return "critical"
  if (stock <= Math.floor(minStock * 0.5)) return "critical"
  if (stock <= minStock) return "warning"
  return "info"
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth()
    if (authResult instanceof Response) {
      return authResult
    }

    const { searchParams } = new URL(request.url)
    const threshold = parseFloat(searchParams.get("threshold") || "1")
    const includeAvailableOnly = searchParams.get("availableOnly") !== "false"
    const severity = searchParams.get("severity") // "critical" | "warning" | "info" | undefined
    const limit = parseInt(searchParams.get("limit") || "100")

    if (isNaN(threshold) || threshold <= 0) {
      return NextResponse.json({ error: "threshold debe ser un número positivo" }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(includeAvailableOnly && { isAvailable: true }),
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
      orderBy: { stock: "asc" },
      take: limit
    })

    let alerts: StockAlert[] = products
      .filter(p => p.stock <= p.minStock * threshold)
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
        const severityOrder = { critical: 0, warning: 1, info: 2 }
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity]
        }
        return b.deficit - a.deficit
      })

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity)
    }

    const criticalCount = alerts.filter(a => a.severity === "critical").length
    const warningCount = alerts.filter(a => a.severity === "warning").length
    const infoCount = alerts.filter(a => a.severity === "info").length

    const response: AlertsResponse = {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      alertsCount: alerts.length,
      criticalCount,
      warningCount,
      infoCount,
      alerts
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching stock alerts:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}