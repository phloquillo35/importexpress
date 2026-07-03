import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email as string },
        })

        if (!admin) return null

        const isValid = await compare(
          credentials.password as string,
          admin.password
        )

        if (!isValid) return null

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.lastActivity = Math.floor(Date.now() / 1000)
        return token
      }

      const now = Math.floor(Date.now() / 1000)
      const lastActivity = token.lastActivity as number | undefined
      if (lastActivity && now - lastActivity > 900) {
        return {}
      }

      token.lastActivity = now
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return session
}

export async function requireRole(...roles: string[]) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!roles.includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  return session
}
