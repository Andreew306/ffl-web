import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Shield, UserCircle2 } from "lucide-react"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { getUserProfileData } from "@/lib/services/profile.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ObjectivesMap } from "@/components/profile/objectives-map"
import { getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function isSeasonRole(roleName: string) {
  const normalized = roleName.normalize("NFKC")
  return /\bS\d+\b/i.test(normalized) || /\b20\d{2}\b/.test(normalized)
}

const rolePriority = [
  "Champion",
  "Diamond",
  "Gold",
  "League",
  "Leaague",
  "Cup",
  "Summer",
  "MVP",
  "rookie",
  "GK",
  "Defender",
  "Midfielder",
  "Attacker",
  "Pichichi",
  "Playmaker",
  "Faye",
  "Team",
  "All",
  "Future",
  "Rising",
]

function getRolePriority(roleName: string) {
  const normalized = roleName.normalize("NFKC").toLowerCase()
  const index = rolePriority.findIndex((keyword) => normalized.includes(keyword.toLowerCase()))
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function getRoleSeasonNumber(roleName: string) {
  const normalized = roleName.normalize("NFKC")
  const seasonMatch = normalized.match(/\bS(\d+)\b/i)
  if (seasonMatch?.[1]) {
    return Number.parseInt(seasonMatch[1], 10)
  }

  const yearMatch = normalized.match(/\b(20\d{2})\b/)
  if (yearMatch?.[1]) {
    return Number.parseInt(yearMatch[1], 10)
  }

  return -1
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/profile")
  }

  await syncDiscordUser(session.user.discordId)
  const profile = await getUserProfileData(session.user.discordId)

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h1 className="text-3xl font-semibold">Perfil no disponible</h1>
          <p className="mt-4 text-slate-300">
            La cuenta ha iniciado sesion, pero no se ha podido inicializar el usuario interno.
          </p>
        </div>
      </div>
    )
  }

  const visibleRoles = profile.user.roles
    .filter((role) => isSeasonRole(role.name))
    .sort((a, b) => {
      const priorityDiff = getRolePriority(a.name) - getRolePriority(b.name)
      if (priorityDiff !== 0) return priorityDiff
      const seasonDiff = getRoleSeasonNumber(b.name) - getRoleSeasonNumber(a.name)
      if (seasonDiff !== 0) return seasonDiff
      return a.name.normalize("NFKC").localeCompare(b.name.normalize("NFKC"), "es", { sensitivity: "base" })
    })
  const avatar = profile.player?.avatar?.trim() || session.user.image?.trim() || ""
  const avatarIsImage = isImageUrl(avatar)
  const countryStyle = profile.player?.country ? getFlagBackgroundStyle(profile.player.country) : null
  const countryOverlay = profile.player?.country && shouldOverlayFlag(profile.player.country)
    ? getTwemojiUrl(profile.player.country)
    : ""

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <section className="rounded-[36px] border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/70 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.45)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-slate-950 bg-gradient-to-br from-orange-500 via-amber-400 to-red-500 p-1 shadow-[0_0_0_6px_rgba(10,18,34,0.9),0_0_40px_rgba(45,212,191,0.18)]">
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-950 text-5xl font-semibold text-white">
                    {avatar ? (
                      avatarIsImage ? (
                        <Image
                          src={avatar}
                          alt={profile.player?.name || session.user.name || "Avatar"}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : (
                        <span>{avatar}</span>
                      )
                    ) : (
                      <span>{(profile.player?.name || session.user.name || "P").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                {profile.player ? (
                  <Button asChild className="mt-5 bg-teal-500 text-slate-950 hover:bg-teal-400">
                    <Link href={`/players/${profile.player.playerId}`}>
                      Ver perfil publico
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.45em] text-slate-300">
                  <Shield className="h-4 w-4 text-teal-300" />
                  Player
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {profile.player?.name || "Cuenta de Discord vinculada"}
                </h1>
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
                    {countryStyle ? (
                      <span
                        aria-label={profile.player?.country}
                        className="h-7 w-7 rounded-full border border-white/10"
                        style={{
                          ...countryStyle,
                          backgroundImage: countryOverlay
                            ? countryStyle.backgroundImage
                              ? `url(${countryOverlay}), ${countryStyle.backgroundImage}`
                              : `url(${countryOverlay})`
                            : countryStyle.backgroundImage,
                          backgroundPosition: countryOverlay
                            ? `center, ${countryStyle.backgroundPosition || "center"}`
                            : countryStyle.backgroundPosition,
                          backgroundSize: countryOverlay
                            ? `cover, ${countryStyle.backgroundSize || "cover"}`
                            : countryStyle.backgroundSize,
                          backgroundRepeat: countryOverlay
                            ? `no-repeat, ${countryStyle.backgroundRepeat || "no-repeat"}`
                            : countryStyle.backgroundRepeat,
                        }}
                      />
                    ) : null}
                    <span className="uppercase tracking-[0.35em] text-slate-400">Country</span>
                    <span className="font-semibold text-white">{profile.player?.country || "-"}</span>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
                    <span className="uppercase tracking-[0.35em] text-slate-400">Player ID</span>
                    <span className="font-semibold text-white">{profile.player?.playerId || "-"}</span>
                  </div>
                </div>
                <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
                  <span className="uppercase tracking-[0.35em] text-slate-400">Discord ID</span>
                  <span className="font-semibold text-white">{profile.user.discordId}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Awards</div>
              <div className="mt-4 space-y-2">
                {visibleRoles.length ? visibleRoles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl border border-teal-400/20 bg-teal-500/10 px-4 py-2 text-sm text-teal-100"
                    title={role.id}
                  >
                    {role.name}
                  </div>
                )) : (
                  <span className="text-slate-400">No awards yet</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {profile.player ? <ObjectivesMap objectives={profile.objectives} /> : null}

        {!profile.player ? (
          <Card className="mt-8 border-amber-400/20 bg-amber-500/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserCircle2 className="h-6 w-6 text-amber-300" />
                Cuenta sin jugador vinculado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-200">
              <p>
                El login con Discord ya funciona, pero esta cuenta todavia no esta enlazada a un jugador de la base de datos. El sistema intenta enlazarlo automaticamente con el `discordId` de Elo cuando la coincidencia es unica.
              </p>
              <p>
                Si no aparece tu jugador, necesitareis asociar manualmente el `playerId` de este usuario en la coleccion `users`.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
