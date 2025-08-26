"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Trophy, Users, Calendar, ImageIcon, FileText, Mail } from "lucide-react"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/", label: "Inicio", icon: Trophy },
    { href: "/seasons", label: "Competiciones", icon: Calendar },
    { href: "/teams", label: "Equipos", icon: Users },
    { href: "/players", label: "Jugadores", icon: ImageIcon },
    { href: "/gallery", label: "Galería", icon: FileText },
    { href: "/contact", label: "Contacto", icon: Mail },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-teal-500/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/ffl-logo.png"
              alt="FFL Logo"
              width={40}
              height={40}
              className="rounded-full border-2 border-teal-400"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-white bg-clip-text text-transparent">
              FFL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-300 hover:text-teal-400 transition-colors flex items-center space-x-1"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-teal-400" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-slate-900 border-teal-500/20">
              <div className="flex flex-col space-y-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-300 hover:text-teal-400 transition-colors flex items-center space-x-2 p-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
