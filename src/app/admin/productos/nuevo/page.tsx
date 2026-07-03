"use client"

import { ProductForm } from "@/components/admin/ProductForm"

export default function NuevoProductoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Nuevo producto</h1>
        <p className="text-muted-foreground text-sm mt-1">Completá los datos para crear un nuevo producto</p>
      </div>
      <ProductForm />
    </div>
  )
}
