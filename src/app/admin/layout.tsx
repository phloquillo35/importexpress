import { Sidebar } from "@/components/admin/Sidebar"
import { AdminHeaderWrapper } from "@/components/admin/AdminHeaderWrapper"
import { SidebarProvider } from "@/context/SidebarContext"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <div className="hidden lg:flex">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeaderWrapper />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
