import type { Metadata } from "next";
import { Rubik, Nunito_Sans } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Lo Pedís, Lo Tenes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lo Pedís, Lo Tenes",
    description: "Importación directa desde Ciudad del Este, Paraguay",
    images: ["/opengraph-image"],
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
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
