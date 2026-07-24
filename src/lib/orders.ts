import { prisma } from "@/lib/prisma"

export const STATUS_PRIORITY: Record<string, number> = {
  demorado: 0,
  cancelado: 1,
  pending: 2,
  en_camino: 3,
  llego: 4,
  entregado: 5,
}

export async function recalculatePaymentStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { totalUSD: true } })
  if (!order) return

  const agg = await prisma.transaction.aggregate({
    where: { orderId },
    _sum: { amountUSD: true },
  })
  const totalPaid = agg._sum.amountUSD ?? 0

  let paymentStatus: string
  if (totalPaid <= 0) paymentStatus = "debe"
  else if (totalPaid < order.totalUSD) paymentStatus = "seña"
  else paymentStatus = "pagado"

  await prisma.order.update({
    where: { id: orderId },
    data: { amountPaidUSD: totalPaid, paymentStatus },
  })
}

export function computeOrderStatus(items: { shippingStatus: string }[]): string {
  let computed = "entregado"
  let minPrio = STATUS_PRIORITY[computed]
  for (const item of items) {
    const prio = STATUS_PRIORITY[item.shippingStatus] ?? 99
    if (prio < minPrio) {
      minPrio = prio
      computed = item.shippingStatus
    }
  }
  return computed
}