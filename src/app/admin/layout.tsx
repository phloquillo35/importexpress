import { Sidebar } from "@/components/admin/Sidebar"
import { AdminHeaderWrapper } from "@/components/admin/AdminHeaderWrapper"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen bg-[#0F172A]">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeaderWrapper />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
