"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"
import { ChevronDown, LogIn, LogOut, UserCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type AuthControlsProps = {
  mobile?: boolean
}

export function AuthControls({ mobile = false }: AuthControlsProps) {
  const { data: session, status } = useSession()
  const isLoading = status === "loading"
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (mobile || !isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen, mobile])

  if (isLoading) {
    return (
      <div className={mobile ? "rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-slate-400" : "text-sm text-slate-400"}>
        Session...
      </div>
    )
  }

  if (!session?.user?.discordId) {
    return (
      <Button
        onClick={() => signIn("discord", { callbackUrl: "/profile" })}
        className={mobile ? "w-full justify-start bg-teal-500 text-slate-950 hover:bg-teal-400" : "bg-teal-500 text-slate-950 hover:bg-teal-400"}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Entrar con Discord
      </Button>
    )
  }

  const profileLink = (
    <Button
      asChild
      variant="outline"
      className={mobile ? "w-full justify-start border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-white/10 bg-white/5 text-white hover:bg-white/10"}
    >
      <Link href="/profile" className={mobile ? "w-full" : ""}>
        <UserCircle2 className="mr-2 h-4 w-4" />
        Mi perfil
      </Link>
    </Button>
  )

  const logoutButton = (
    <Button
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="ghost"
      className={mobile ? "w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Salir
    </Button>
  )

  if (mobile) {
    return (
      <div className="space-y-3">
        {profileLink}
        {logoutButton}
      </div>
    )
  }

  const userImage = session.user.image?.trim()
  const fallbackLabel = session.user.name?.trim()?.charAt(0).toUpperCase() || "D"

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
      >
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-teal-400/30 bg-slate-900 text-sm font-semibold text-teal-100">
          {userImage ? (
            <Image
              src={userImage}
              alt={session.user.name || "Discord avatar"}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            fallbackLabel
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] min-w-56 rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_24px_50px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-3">
            <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-teal-400/30 bg-slate-900 text-sm font-semibold text-teal-100">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={session.user.name || "Discord avatar"}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                fallbackLabel
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium text-white">{session.user.name || "Usuario Discord"}</div>
              <div className="truncate text-xs text-slate-400">{session.user.discordId}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[28px] border border-white/10 bg-slate-900/70 p-2">
            <Button
              asChild
              variant="outline"
              className="h-11 flex-1 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/profile" onClick={() => setIsOpen(false)}>
                <UserCircle2 className="mr-2 h-4 w-4" />
                Mi perfil
              </Link>
            </Button>
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="ghost"
              className="h-11 flex-1 rounded-2xl text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
