"use client"

import { useEffect, useRef, useState, type SVGProps } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AuthControls } from "@/components/auth/auth-controls"
import { ChevronDown, Gamepad2, Grid3X3, HandCoins, LayoutTemplate, ListOrdered, Menu, Scale, Swords, Trophy, TrendingUp, Users, Calendar, ImageIcon, Medal, Keyboard } from "lucide-react"

function DiscordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" {...props}>
      <path d="M19.54 4.27a17.77 17.77 0 0 0-4.29-1.33c-.18.33-.39.76-.54 1.1a16.9 16.9 0 0 0-4.42 0c-.15-.35-.36-.78-.54-1.1-1.49.26-2.92.72-4.29 1.33C2.9 7.6 2.23 10.85 2.5 14.05c1.64 1.21 3.22 1.95 4.77 2.44.39-.53.74-1.1 1.03-1.7-.56-.21-1.1-.46-1.62-.76.13-.1.26-.2.38-.3 3.12 1.46 6.51 1.46 9.59 0 .13.11.26.21.39.3-.52.3-1.06.55-1.62.76.29.6.63 1.17 1.03 1.7 1.55-.49 3.13-1.23 4.77-2.44.33-3.71-.57-6.93-2.39-9.78ZM8.95 13.6c-.68 0-1.23-.62-1.23-1.38s.54-1.38 1.23-1.38c.69 0 1.25.62 1.23 1.38 0 .76-.54 1.38-1.23 1.38Zm6.1 0c-.68 0-1.23-.62-1.23-1.38s.54-1.38 1.23-1.38c.69 0 1.25.62 1.23 1.38 0 .76-.54 1.38-1.23 1.38Z" />
    </svg>
  )
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinigamesOpen, setIsMinigamesOpen] = useState(false)
  const [isMobileMinigamesOpen, setIsMobileMinigamesOpen] = useState(false)
  const pathname = usePathname()
  const minigamesRef = useRef<HTMLDivElement | null>(null)

  const navItems = [
    { href: "/", label: "Home", icon: Trophy },
    { href: "/seasons", label: "Competitions", icon: Calendar },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/players", label: "Players", icon: ImageIcon },
    { href: "/hall-of-fame", label: "Hall of Fame", icon: Medal },
    { href: "https://discord.gg/n26a4FsAtT", label: "Discord", icon: DiscordIcon, external: true },
  ]
  const minigameItems = [
    { href: "/elo", label: "Elo", icon: TrendingUp },
    { href: "/fantasy", label: "Fantasy", icon: Swords },
    { href: "/betball", label: "BetBall", icon: HandCoins },
    { href: "/tic-tac-toe", label: "Tic Tac Toe", icon: Grid3X3 },
    { href: "/wordle", label: "Wordle", icon: Keyboard },
    { href: "/ideal-7", label: "Ideal 7", icon: LayoutTemplate },
    { href: "/tier-list", label: "Tier List", icon: ListOrdered },
    { href: "/compare", label: "Head2Head", icon: Scale },
  ]
  const isMinigamesActive =
    pathname?.startsWith("/elo")
    || pathname?.startsWith("/fantasy")
    || pathname?.startsWith("/betball")
    || pathname?.startsWith("/tic-tac-toe")
    || pathname?.startsWith("/wordle")
    || pathname?.startsWith("/ideal-7")
    || pathname?.startsWith("/tier-list")
    || pathname?.startsWith("/compare")

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!minigamesRef.current) return
      if (!minigamesRef.current.contains(event.target as Node)) {
        setIsMinigamesOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const primaryNavItems = navItems.filter((item) => item.label !== "Discord")
  const discordNavItem = navItems.find((item) => item.label === "Discord")

  return (
    <nav className="relative left-0 right-0 top-12 z-50">
      <div className="container mx-auto px-4">
        <div className="rounded-[28px] bg-gradient-to-r from-slate-800/50 via-teal-500/30 to-slate-800/50 p-[1px] shadow-[0_20px_50px_rgba(8,15,30,0.55)]">
          <div className="rounded-[27px] border border-white/5 bg-slate-950/75 backdrop-blur-xl">
            <div className="flex h-24 items-center justify-between px-6">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/ffl-logo.png"
                  alt="FFL Logo"
                  width={42}
                  height={42}
                  className="rounded-full border border-teal-300/50 shadow-[0_0_18px_rgba(45,212,191,0.25)]"
                />
                <span className="text-xl font-semibold text-slate-100 tracking-wide">FFL</span>
              </Link>

              <div className="hidden md:flex items-center gap-5 rounded-full border border-white/5 bg-slate-900/50 px-4 py-3">
                {primaryNavItems.map((item) => {
                  const isExternal = Boolean(item.external)
                  const isActive = !isExternal
                    && (item.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(item.href))
                  const className = `group relative flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold transition-all ${
                    isActive
                      ? "bg-white/10 text-white shadow-[0_8px_20px_rgba(15,23,42,0.35)]"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`
                  const iconClassName = isExternal ? "h-5 w-5 fill-current" : "h-5 w-5"

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={className}
                      prefetch={!isExternal}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noreferrer" : undefined}
                    >
                      <item.icon className={iconClassName} />
                      <span>{item.label}</span>
                      <span className="pointer-events-none absolute inset-x-3 -bottom-1 h-px origin-left scale-x-0 bg-gradient-to-r from-teal-300/0 via-teal-300/80 to-teal-300/0 transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  )
                })}
                <div ref={minigamesRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMinigamesOpen((value) => !value)}
                    className={`group relative flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold transition-all ${
                      isMinigamesActive || isMinigamesOpen
                        ? "bg-white/10 text-white shadow-[0_8px_20px_rgba(15,23,42,0.35)]"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Gamepad2 className="h-5 w-5" />
                    <span>Minigames</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isMinigamesOpen ? "rotate-180" : ""}`} />
                    <span className="pointer-events-none absolute inset-x-3 -bottom-1 h-px origin-left scale-x-0 bg-gradient-to-r from-teal-300/0 via-teal-300/80 to-teal-300/0 transition-transform duration-300 group-hover:scale-x-100" />
                  </button>

                  {isMinigamesOpen ? (
                    <div className="absolute left-0 top-[calc(100%+12px)] z-50 min-w-[200px] rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                      {minigameItems.map((item) => {
                        const isActive = pathname?.startsWith(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMinigamesOpen(false)}
                            className={`flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                              isActive
                                ? "bg-white/10 text-white"
                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <item.icon className="mr-3 h-4 w-4" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
                {discordNavItem ? (() => {
                  const item = discordNavItem
                  const isExternal = Boolean(item.external)
                  const isActive = !isExternal
                    && (item.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(item.href))
                  const className = `group relative flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold transition-all ${
                    isActive
                      ? "bg-white/10 text-white shadow-[0_8px_20px_rgba(15,23,42,0.35)]"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`
                  const iconClassName = isExternal ? "h-5 w-5 fill-current" : "h-5 w-5"

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={className}
                      prefetch={!isExternal}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noreferrer" : undefined}
                    >
                      <item.icon className={iconClassName} />
                      <span>{item.label}</span>
                      <span className="pointer-events-none absolute inset-x-3 -bottom-1 h-px origin-left scale-x-0 bg-gradient-to-r from-teal-300/0 via-teal-300/80 to-teal-300/0 transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  )
                })() : null}
                <AuthControls />
              </div>

              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/10 bg-slate-900/60 hover:bg-slate-900/80"
                  >
                    <Menu className="h-7 w-7 text-slate-200" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="border-teal-500/20 bg-slate-950/95">
                  <div className="mt-8 space-y-3">
                    {navItems.map((item) => {
                      const isExternal = Boolean(item.external)
                      const isActive = !isExternal
                        && (item.href === "/"
                          ? pathname === "/"
                          : pathname?.startsWith(item.href))
                      const className = `flex items-center gap-3 rounded-xl border px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? "border-teal-400/40 bg-teal-500/10 text-white"
                          : "border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      }`
                      const iconClassName = isExternal ? "h-6 w-6 fill-current" : "h-6 w-6"

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={className}
                          onClick={() => setIsOpen(false)}
                          prefetch={!isExternal}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noreferrer" : undefined}
                        >
                          <item.icon className={iconClassName} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                    <div className="rounded-xl border border-white/5 bg-white/5">
                      <button
                        type="button"
                        onClick={() => setIsMobileMinigamesOpen((value) => !value)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                          isMinigamesActive
                            ? "text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Gamepad2 className="h-6 w-6" />
                          <span>Minigames</span>
                        </span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isMobileMinigamesOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isMobileMinigamesOpen ? (
                        <div className="space-y-2 px-3 pb-3">
                          {minigameItems.map((item) => {
                            const isActive = pathname?.startsWith(item.href)
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  isActive
                                    ? "bg-teal-500/10 text-white"
                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                                }`}
                                onClick={() => {
                                  setIsOpen(false)
                                  setIsMobileMinigamesOpen(false)
                                }}
                              >
                                <item.icon className="mr-3 h-4 w-4" />
                                {item.label}
                              </Link>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                    <AuthControls mobile />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
