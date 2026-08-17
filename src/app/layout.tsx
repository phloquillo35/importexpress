import type { Metadata, Viewport } from "next";
import { Rubik, Nunito_Sans } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider, ThemeColorSync } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const rubik = Rubik({
  variable: "--font-heading",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lo Pedís, Lo Tenes",
    template: "%s | Lo Pedís, Lo Tenes",
  },
  description: "Importación directa desde Ciudad del Este, Paraguay",
  openGraph: {
    title: "Lo Pedís, Lo Tenes",
    description: "Importación directa desde Ciudad del Este, Paraguay",
    url: "https://lopedislotenes.com",
    siteName: "Lo Pedís, Lo Tenes",
    locale: "es_AR",
    type: "website",
    images: [{ url: "/images/og-whatsapp.jpg", width: 1200, height: 630, alt: "Lo Pedís, Lo Tenes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lo Pedís, Lo Tenes",
    description: "Importación directa desde Ciudad del Este, Paraguay",
    images: ["/images/og-whatsapp.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${rubik.variable} ${nunitoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorSync />
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
