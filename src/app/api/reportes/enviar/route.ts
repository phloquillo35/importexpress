import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

function formatARS(n: number) {
  return "$" + n.toLocaleString("es-AR")
}

function formatUSD(n: number) {
  return "$" + n.toFixed(2)
}

function buildReportHTML(data: Awaited<ReturnType<typeof gatherReportData>>) {
  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "long",
    timeStyle: "short",
  })

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto;">
    <tr>
      <td style="background: #1a1a2e; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 22px;">${data.businessName}</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Reporte generado el ${now}</p>
      </td>
    </tr>

    <tr>
      <td style="background: white; padding: 24px; border-radius: 0 0 12px 12px;">
        ${kpiCards(data)}
        ${productsSection(data)}
        ${ordersSection(data)}
        ${financesSection(data)}
        ${stockSection(data)}
      </td>
    </tr>
  </table>
</body>
</html>`
}

function kpiCards(data: any) {
  const cards = [
    { label: "Productos", value: data.totalProducts, color: "#22C55E" },
    { label: "Pedidos totales", value: data.totalOrders, color: "#3B82F6" },
    { label: "Ingresos", value: formatARS(data.totalIncomeARS), color: "#22C55E" },
    { label: "Stock bajo", value: data.lowStockCount, color: "#EF4444" },
  ]

  const cardsHtml = cards.map(c => `
    <td style="padding: 12px; text-align: center; background: #f8fafc; border-radius: 8px; width: 25%;">
      <div style="font-size: 22px; font-weight: 700; color: ${c.color};">${c.value}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${c.label}</div>
    </td>
  `).join("")

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>${cardsHtml}</tr>
    </table>`
}

function productsSection(data: any) {
  const rows = data.productsByCategory.map((c: any) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${c.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${c._count.products}</td>
    </tr>
  `).join("")

  return `
    <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 8px;">Productos</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px; background: #f1f5f9; font-weight: 600; color: #475569; font-size: 13px;">Categoría</td>
        <td style="padding: 8px 12px; background: #f1f5f9; font-weight: 600; color: #475569; font-size: 13px; text-align: center;">Cantidad</td>
      </tr>
      ${rows}
      <tr>
        <td style="padding: 8px 12px; font-weight: 700; color: #0f172a; border-top: 2px solid #334155;">Total</td>
        <td style="padding: 8px 12px; font-weight: 700; color: #0f172a; text-align: center; border-top: 2px solid #334155;">${data.totalProducts}</td>
      </tr>
    </table>

    <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
      Destacados: <strong>${data.featuredCount}</strong> &nbsp;|&nbsp; Disponibles: <strong>${data.availableCount}</strong> &nbsp;|&nbsp; No disponibles: <strong>${data.unavailableCount}</strong>
    </div>`
}

function ordersSection(data: any) {
  const statusLabels: Record<string, string> = {
    pending: "Pendientes",
    en_camino: "En camino",
    demorado: "Demorados",
    llego: "Llegaron",
    entregado: "Entregados",
    cancelado: "Cancelados",
  }

  const statusColors: Record<string, string> = {
    pending: "#F59E0B",
    en_camino: "#3B82F6",
    demorado: "#EF4444",
    llego: "#22C55E",
    entregado: "#22C55E",
    cancelado: "#64748b",
  }

  const rows = Object.entries(data.ordersByStatus).map(([status, count]) => `
    <tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${statusColors[status] || "#94a3b8"}; margin-right: 8px;"></span>
        ${statusLabels[status] || status}
      </td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${count}</td>
    </tr>
  `).join("")

  return `
    <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 8px;">Pedidos</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
      ${rows}
    </table>
    <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
      Ingreso total: <strong style="color: #22C55E;">${formatARS(data.totalIncomeARS)}</strong> &nbsp;|&nbsp;
      Últimos 30 días: <strong>${data.recentOrdersCount}</strong> pedidos (${formatARS(data.recentOrdersRevenue)})
    </div>`
}

function financesSection(data: any) {
  return `
    <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 8px;">Finanzas</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 12px; color: #64748b; font-size: 13px;">Ingresos</td>
        <td style="padding: 6px 12px; text-align: right; font-weight: 600; color: #22C55E;">${formatARS(data.totalIncome)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; color: #64748b; font-size: 13px;">Egresos</td>
        <td style="padding: 6px 12px; text-align: right; font-weight: 600; color: #EF4444;">${formatARS(data.totalExpenses)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; color: #64748b; font-size: 13px; border-top: 2px solid #e2e8f0;">Balance</td>
        <td style="padding: 6px 12px; text-align: right; font-weight: 700; color: ${data.balance >= 0 ? "#22C55E" : "#EF4444"}; border-top: 2px solid #e2e8f0;">${formatARS(data.balance)}</td>
      </tr>
    </table>`
}

function stockSection(data: any) {
  if (data.lowStockProducts.length === 0) {
    return `
      <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 8px;">Stock bajo</h2>
      <p style="color: #22C55E; font-size: 13px;">No hay productos con stock bajo.</p>`
  }

  const rows = data.lowStockProducts.map((p: any) => `
    <tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${p.name}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #EF4444; font-weight: 600;">${p.stock}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${p.minStock}</td>
    </tr>
  `).join("")

  return `
    <h2 style="font-size: 16px; color: #1e293b; margin: 0 0 8px;">Stock bajo</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 12px; background: #f1f5f9; font-weight: 600; color: #475569; font-size: 13px;">Producto</td>
        <td style="padding: 8px 12px; background: #f1f5f9; font-weight: 600; color: #475569; font-size: 13px; text-align: center;">Stock</td>
        <td style="padding: 8px 12px; background: #f1f5f9; font-weight: 600; color: #475569; font-size: 13px; text-align: center;">Mínimo</td>
      </tr>
      ${rows}
    </table>`
}

async function gatherReportData() {
  const businessNameSetting = await prisma.setting.findUnique({ where: { key: "business_name" } })
  const businessName = businessNameSetting?.value || "Lo Pedís, Lo Tenes"

  const exchangeRateSetting = await prisma.setting.findUnique({ where: { key: "exchange_rate" } })
  const exchangeRate = Number(exchangeRateSetting?.value) || 1350

  const [totalProducts, productsByCategory, lowStockProducts, featuredCount, availableCount, unavailableCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
    prisma.product.findMany({ where: { stock: { lte: prisma.product.fields.minStock } }, select: { name: true, stock: true, minStock: true } }),
    prisma.product.count({ where: { isFeatured: true } }),
    prisma.product.count({ where: { isAvailable: true } }),
    prisma.product.count({ where: { isAvailable: false } }),
  ])

  const lowStockCount = lowStockProducts.length

  const [totalOrders, allOrders, recentOrders, ordersByStatusRaw] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({ select: { totalARS: true, status: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, select: { totalARS: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
  ])

  const totalIncomeARS = allOrders.reduce((sum, o) => sum + (o.totalARS || 0), 0)
  const recentOrdersCount = recentOrders.length
  const recentOrdersRevenue = recentOrders.reduce((sum, o) => sum + (o.totalARS || 0), 0)

  const ordersByStatus: Record<string, number> = {}
  for (const s of ordersByStatusRaw) {
    ordersByStatus[s.status] = s._count.id
  }
  for (const status of ["pending", "en_camino", "demorado", "llego", "entregado", "cancelado"]) {
    if (!ordersByStatus[status]) ordersByStatus[status] = 0
  }

  const [transactions, totalIncome, totalExpenses] = await Promise.all([
    prisma.transaction.findMany({ select: { type: true, amountARS: true } }),
    prisma.transaction.aggregate({ where: { type: "income" }, _sum: { amountARS: true } }),
    prisma.transaction.aggregate({ where: { type: "expense" }, _sum: { amountARS: true } }),
  ])

  const income = totalIncome._sum.amountARS || 0
  const expenses = totalExpenses._sum.amountARS || 0
  const balance = income - expenses

  return {
    businessName,
    exchangeRate,
    totalProducts,
    productsByCategory,
    lowStockProducts,
    lowStockCount,
    featuredCount,
    availableCount,
    unavailableCount,
    totalOrders,
    totalIncomeARS,
    recentOrdersCount,
    recentOrdersRevenue,
    ordersByStatus,
    transactions,
    totalIncome: income,
    totalExpenses: expenses,
    balance,
  }
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const data = await gatherReportData()
    const html = buildReportHTML(data)
    await sendEmail({ to: session.user.email, subject: `Reporte - ${data.businessName}`, text: `Reporte adjunto de ${data.businessName}`, html })

    return Response.json({ success: true, message: "Reporte enviado a " + session.user.email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al generar el reporte"
    return Response.json({ error: msg }, { status: 500 })
  }
}
