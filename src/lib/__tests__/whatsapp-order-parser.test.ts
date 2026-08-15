import { describe, it, expect } from "vitest"
import { parseWhatsAppOrder, splitClientName } from "@/lib/whatsapp-order-parser"

describe("splitClientName", () => {
  it("should split first name and last name", () => {
    expect(splitClientName("Juan Perez")).toEqual({ clientName: "Juan", clientSurname: "Perez" })
    expect(splitClientName("Juan Carlos Perez")).toEqual({ clientName: "Juan Carlos", clientSurname: "Perez" })
  })

  it("should handle single name", () => {
    expect(splitClientName("Juan")).toEqual({ clientName: "Juan", clientSurname: "" })
  })
})

describe("parseWhatsAppOrder", () => {
  it("should parse cart message with multiple products", () => {
    const text = `¡Hola! Quiero hacer un pedido:

🛒 *Productos:*
1. Apple iPhone 15 - $1.234.567 ARS x 2 = $2.469.134 ARS
   🔗 https://dominio/productos/iphone-15
2. Notebook Samsung NP750 - $999.999 ARS x 1 = $999.999 ARS
   🔗 https://dominio/productos/notebook-samsung-np750

💰 *Total:* $3.469.133 ARS

👤 *Datos:*
Nombre: Juan Carlos Perez
Teléfono: +5491112345678
Dirección: Calle Falsa 123
Email: juan@mail.com

¡Gracias!`

    const parsed = parseWhatsAppOrder(text)
    expect(parsed.clientName).toBe("Juan Carlos")
    expect(parsed.clientSurname).toBe("Perez")
    expect(parsed.clientPhone).toBe("+5491112345678")
    expect(parsed.clientEmail).toBe("juan@mail.com")
    expect(parsed.address).toBe("Calle Falsa 123")
    expect(parsed.items).toEqual([
      { name: "Apple iPhone 15", slug: "iphone-15", quantity: 2 },
      { name: "Notebook Samsung NP750", slug: "notebook-samsung-np750", quantity: 1 },
    ])
  })

  it("should parse single product message", () => {
    const text = `¡Hola! Quiero hacer un pedido:

🛒 *Producto:*
1. Smart TV 55 4K - $2.500.000 ARS
   🔗 https://dominio/productos/smart-tv-55

💰 *Total:* $2.500.000 ARS

👤 *Datos:*
Nombre: Maria Lopez
Teléfono: 3815551234
Dirección: Av. Siempre Viva 742
Email: maria@mail.com

¡Gracias!`

    const parsed = parseWhatsAppOrder(text)
    expect(parsed.clientName).toBe("Maria")
    expect(parsed.clientSurname).toBe("Lopez")
    expect(parsed.clientPhone).toBe("3815551234")
    expect(parsed.clientEmail).toBe("maria@mail.com")
    expect(parsed.items).toEqual([
      { name: "Smart TV 55 4K", slug: "smart-tv-55", quantity: 1 },
    ])
  })

  it("should default quantity to 1 when not specified", () => {
    const text = `🛒 *Producto:*
1. Auriculares Bluetooth - $150.000 ARS
   🔗 https://dominio/productos/auriculares-bt

👤 *Datos:*
Nombre: Ana
Teléfono: 123
Dirección: X
Email: ana@mail.com`

    const parsed = parseWhatsAppOrder(text)
    expect(parsed.items).toEqual([
      { name: "Auriculares Bluetooth", slug: "auriculares-bt", quantity: 1 },
    ])
  })

  it("should tolerate missing email", () => {
    const text = `🛒 *Producto:*
1. Perfume - $200.000 ARS
   🔗 https://dominio/productos/perfume

👤 *Datos:*
Nombre: Ana
Teléfono: 123
Dirección: X`

    const parsed = parseWhatsAppOrder(text)
    expect(parsed.clientEmail).toBe("")
    expect(parsed.address).toBe("X")
    expect(parsed.items).toHaveLength(1)
  })
})
