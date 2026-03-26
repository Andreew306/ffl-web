import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { AuthSessionProvider } from "@/components/providers/session-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FFL - Futsal Fusion League | Liga eSports",
  description: "La liga de eSports más competitiva de Haxball 7v7 - Futsal Fusion League",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <AuthSessionProvider>
          <Navigation />
          <main className="pt-24">{children}</main>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  )
}
