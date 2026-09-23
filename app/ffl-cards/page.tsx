import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Layers3, PackageOpen, Shield, Swords, Trophy } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { getAllApprovedBaseCards } from "@/lib/services/profile-card-gallery.service"
import { MyClub } from "@/components/ffl-cards/my-club"

type FflCardsPageProps = {
  searchParams?: Promise<{ view?: string }>
}

const sections = [
  { key: "club", label: "My Club", description: "Collection, album and squad.", icon: Layers3 },
  { key: "arena", label: "FFL Arena", description: "Compete against other squads.", icon: Swords },
  { key: "packs", label: "Packs & SBC", description: "Packs, exchanges and squad challenges.", icon: PackageOpen },
  { key: "challenges", label: "Challenges", description: "Drafts, quizzes and objectives.", icon: Trophy },
] as const

type SectionKey = (typeof sections)[number]["key"]

export default async function FflCardsPage({ searchParams }: FflCardsPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/ffl-cards")
  }

  const resolvedSearchParams = await searchParams
  const requestedView = resolvedSearchParams?.view
  const activeView: SectionKey = sections.some((section) => section.key === requestedView)
    ? requestedView as SectionKey
    : "club"
  const cards = activeView === "club"
    ? await getAllApprovedBaseCards()
    : []
  const activeSection = sections.find((section) => section.key === activeView) || sections[0]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="border-b border-amber-300/25 pb-7">
          <div className="flex items-center gap-3 text-amber-300">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.35em]">Minigames</span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold text-white">FFL Cards</h1>
          <p className="mt-2 text-slate-400">Your Haxball card collection.</p>
        </header>

        <nav className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="FFL Cards sections">
          {sections.map((section) => {
            const Icon = section.icon
            const active = activeView === section.key
            return (
              <Link
                key={section.key}
                href={section.key === "club" ? "/ffl-cards" : `/ffl-cards?view=${section.key}`}
                className={`min-h-28 border p-4 transition-colors ${
                  active
                    ? "border-amber-300/70 bg-emerald-950 text-white"
                    : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-amber-300/35 hover:bg-slate-900"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-amber-300" : "text-slate-400"}`} />
                <div className="mt-3 text-sm font-semibold uppercase">{section.label}</div>
                <div className="mt-1 text-xs text-slate-400">{section.description}</div>
              </Link>
            )
          })}
        </nav>

        {activeView === "club" ? (
          <MyClub availableCards={cards} />
        ) : (
          <section className="mt-10 flex min-h-72 flex-col items-center justify-center border border-white/10 bg-slate-900/50 px-6 text-center">
            <activeSection.icon className="h-9 w-9 text-amber-300" />
            <h2 className="mt-4 text-2xl font-semibold">{activeSection.label}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">{activeSection.description}</p>
            <div className="mt-5 border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              Coming soon
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
