export interface OrderMessageItem {
  name: string
  color?: string | null
  price: number
  quantity: number
  slug: string
}

export interface OrderMessageForm {
  name: string
  phone: string
  address: string
  email: string
}

export function buildWhatsAppOrderMessage(items: OrderMessageItem[], form: OrderMessageForm) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const lines: string[] = ["¡Hola! Quiero hacer un pedido:\n"]
  lines.push("🛒 *Productos:*")
  items.forEach((item, i) => {
    const subtotal = item.price * item.quantity
    const label = item.color ? `${item.name} (Color: ${item.color})` : item.name
    lines.push(
      `${i + 1}. ${label} - $${item.price.toLocaleString("es-AR")} ARS x ${item.quantity} = $${subtotal.toLocaleString("es-AR")} ARS`
    )
    const productUrl = origin ? `${origin}/productos/${item.slug}` : ""
    if (productUrl) lines.push(`   🔗 ${productUrl}`)
  })
  lines.push(`\n💰 *Total:* $${total.toLocaleString("es-AR")} ARS`)
  lines.push(`\n👤 *Datos:*`)
  lines.push(`Nombre: ${form.name}`)
  lines.push(`Teléfono: ${form.phone}`)
  lines.push(`Dirección: ${form.address}`)
  lines.push(`Email: ${form.email}`)
  lines.push("\n¡Gracias!")
  return lines.join("\n")
}
