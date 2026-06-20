"use client"

import { useState } from "react"
import { Search, Ship, CreditCard, ChevronDown, MessageCircle } from "lucide-react"
import Link from "next/link"

const faqs = [
  {
    q: "¿Cómo hago un pedido?",
    a: "Simplemente navegá por nuestro catálogo, encontrá el producto que te guste y envianos un mensaje por WhatsApp con el nombre del producto. Nosotros te asesoramos sobre el proceso.",
  },
  {
    q: "¿Cuánto tardan los envíos?",
    a: "Los tiempos de entrega varían según el producto y la disponibilidad. En general, los envíos internacionales demoran entre 7 y 21 días hábiles desde la confirmación del pedido.",
  },
  {
    q: "¿Cómo se calcula el precio final?",
    a: "El precio final incluye el costo del producto, los impuestos de importación, el flete y nuestra comisión de gestión. Te damos un presupuesto cerrado antes de confirmar.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos transferencia bancaria, depósito en cuenta y criptomonedas (USDT). Consultanos por otras opciones.",
  },
  {
    q: "¿Hay garantía?",
    a: "Sí, todos nuestros productos cuentan con garantía. Los detalles específicos te los brindamos al momento de la compra, ya que varían según el producto y el fabricante.",
  },
  {
    q: "¿Puedo hacer seguimiento de mi pedido?",
    a: "Sí, una vez realizado el envío te proporcionamos un número de seguimiento para que puedas monitorear tu pedido en tiempo real.",
  },
]

export default function ComoFuncionaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div>
      <div className="bg-gradient-to-r from-[#F59E0B]/10 via-transparent to-[#8B5CF6]/10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading mb-4">
            ¿Cómo funciona?
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Te explicamos paso a paso cómo hacer tu primera importación con nosotros
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="relative text-center p-8 bg-white/5 border border-white/10 rounded-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#F59E0B] text-white text-sm font-bold flex items-center justify-center">
              1
            </div>
            <div className="w-14 h-14 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-5 mt-2">
              <Search className="w-7 h-7 text-[#F59E0B]" />
            </div>
            <h3 className="text-lg font-semibold text-white font-heading mb-3">Elegí tus productos</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Navegá por nuestro catálogo online y seleccioná los productos que querés importar. 
              Si no encontrás algo, consultanos igual — podemos conseguirlo.
            </p>
          </div>

          <div className="relative text-center p-8 bg-white/5 border border-white/10 rounded-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#8B5CF6] text-white text-sm font-bold flex items-center justify-center">
              2
            </div>
            <div className="w-14 h-14 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-5 mt-2">
              <Ship className="w-7 h-7 text-[#8B5CF6]" />
            </div>
            <h3 className="text-lg font-semibold text-white font-heading mb-3">Nos encargamos de todo</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Una vez que confirmás tu pedido, gestionamos la compra internacional, 
              trámites aduaneros, impuestos y logística desde Punta del Este hasta tu puerta.
            </p>
          </div>

          <div className="relative text-center p-8 bg-white/5 border border-white/10 rounded-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#22C55E] text-white text-sm font-bold flex items-center justify-center">
              3
            </div>
            <div className="w-14 h-14 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-5 mt-2">
              <CreditCard className="w-7 h-7 text-[#22C55E]" />
            </div>
            <h3 className="text-lg font-semibold text-white font-heading mb-3">Recibí en tu casa</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Te mantenemos informado en cada etapa. Recibís tus productos directamente en tu domicilio, 
              con total seguridad y transparencia.
            </p>
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading mb-3">
            ¿Listo para empezar?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Contactanos por WhatsApp y te asesoramos sin compromiso
          </p>
          <Link
            href="https://wa.me/5491123456789"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold rounded-xl transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Escribinos por WhatsApp
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading text-center mb-10">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left text-white font-medium transition-colors hover:bg-white/5"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
