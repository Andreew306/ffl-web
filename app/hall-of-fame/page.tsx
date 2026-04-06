import Image from "next/image"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getHallOfFameData, type HallOfFameFilter } from "@/lib/services/hall-of-fame.service"
import { PROFILE_ROLE_MANAGER_ID } from "@/lib/services/profile.service"
import { getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function FlagBadge({ country, className }: { country: string; className?: string }) {
  const baseStyle = getFlagBackgroundStyle(country)
  const overlayUrl = shouldOverlayFlag(country) ? getTwemojiUrl(country) : ""
  const backgroundImage = overlayUrl
    ? baseStyle.backgroundImage
      ? `url(${overlayUrl}), ${baseStyle.backgroundImage}`
      : `url(${overlayUrl})`
    : baseStyle.backgroundImage
  const basePosition = baseStyle.backgroundPosition || "center"
  const baseSize = baseStyle.backgroundSize || "cover"
  const baseRepeat = baseStyle.backgroundRepeat || "no-repeat"

  return (
    <span
      aria-label={country}
      className={className}
      style={{
        backgroundColor: baseStyle.backgroundColor,
        backgroundImage,
        backgroundPosition: overlayUrl ? `center, ${basePosition}` : basePosition,
        backgroundSize: overlayUrl ? `cover, ${baseSize}` : baseSize,
        backgroundRepeat: overlayUrl ? `no-repeat, ${baseRepeat}` : baseRepeat,
      }}
    />
  )
}

function RankingPlayerCell({
  playerId,
  playerName,
  country,
  avatar,
  kitImage,
}: {
  playerId: number
  playerName: string
  country?: string
  avatar?: string
  kitImage?: string
}) {
  const avatarIsImage = isImageUrl(avatar || "")
  const avatarIsEmoji = Boolean(avatar && !avatarIsImage)

  return (
    <Link href={`/players/${playerId}`} className="group inline-flex items-center gap-3 rounded-xl">
      <div className="relative h-12 w-12">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-950/90 shadow-[0_10px_24px_rgba(2,6,23,0.45)] ${
            kitImage ? "bg-slate-900/80" : "bg-slate-900/80 ring-1 ring-white/10"
          }`}
          style={
            kitImage
              ? {
                  backgroundImage: `url(${kitImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {avatarIsImage && avatar ? (
            <Image
              src={avatar}
              alt={playerName}
              width={34}
              height={34}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : avatarIsEmoji ? (
            <span className="text-lg leading-none">{avatar}</span>
          ) : null}
        </div>
        {country ? (
          <FlagBadge
            country={country}
            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-slate-950"
          />
        ) : null}
      </div>
      <span className="font-semibold text-white transition group-hover:text-cyan-200">{playerName}</span>
    </Link>
  )
}

function RoleHitTooltip({ value, roleNames }: { value: number; roleNames: string[] }) {
  const hasRoles = roleNames.length > 0

  return (
    <div className="group relative inline-flex items-center">
      <span className="cursor-help">{value}</span>
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-max max-w-[340px] -translate-x-1/2 rounded-xl border border-cyan-300/30 bg-slate-950/98 p-2 shadow-[0_16px_40px_rgba(2,6,23,0.65)] ring-1 ring-white/10 backdrop-blur group-hover:block">
        <div className="px-1 pb-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200/85">Roles</div>
        {hasRoles ? (
          <div className="max-h-48 overflow-y-auto pr-1 text-xs text-slate-100 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/60">
            {roleNames.map((roleName, index) => (
              <div
                key={`${roleName}-${index}`}
                className="whitespace-nowrap rounded-md border border-white/10 bg-slate-900/70 px-2 py-1"
              >
                {roleName}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-1 py-0.5 text-xs text-slate-300">No roles</div>
        )}
      </div>
    </div>
  )
}

export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filterParam = params?.filter
  const selectedFilter: HallOfFameFilter =
    filterParam === "collective" || filterParam === "individual" ? filterParam : "all"
  const session = await getServerSession(authOptions)
  const canManageRolePoints = Boolean(
    session?.user?.roles?.some((role) => role.id === PROFILE_ROLE_MANAGER_ID)
  )
  const data = await getHallOfFameData(selectedFilter)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Hall of Fame</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">All-time Ranking</h1>
              <p className="mt-2 text-sm text-slate-400">Ranking by assigned role points.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/hall-of-fame"
                  className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
                    selectedFilter === "all"
                      ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                      : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100"
                  }`}
                >
                  Both
                </Link>
                <Link
                  href="/hall-of-fame?filter=collective"
                  className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
                    selectedFilter === "collective"
                      ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                      : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100"
                  }`}
                >
                  Collective
                </Link>
                <Link
                  href="/hall-of-fame?filter=individual"
                  className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
                    selectedFilter === "individual"
                      ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                      : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100"
                  }`}
                >
                  Individual
                </Link>
              </div>
            </div>
            {canManageRolePoints ? (
              <Link
                href="/profile/manage-roles"
                className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Manage role points
              </Link>
            ) : null}
          </div>

          {data.entries.length ? (
            <div className="mt-6 overflow-x-auto overflow-y-visible rounded-2xl border border-white/10 [scrollbar-width:thin] [scrollbar-color:rgba(45,212,191,0.75)_rgba(15,23,42,0.55)] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-slate-900/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-400/70">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-slate-300">
                    <th className="sticky top-0 z-20 bg-slate-950/95 px-4 py-3 backdrop-blur">#</th>
                    <th className="sticky top-0 z-20 bg-slate-950/95 px-4 py-3 backdrop-blur">Player</th>
                    <th className="sticky top-0 z-20 bg-slate-950/95 px-4 py-3 backdrop-blur">Total</th>
                    <th className="sticky top-0 z-20 bg-slate-950/95 px-4 py-3 backdrop-blur">Roles</th>
                    {data.roles.map((role) => (
                      <th key={role.roleId} className="sticky top-0 z-20 whitespace-nowrap bg-slate-950/95 px-4 py-3 backdrop-blur">
                        {role.roleName}
                        <span className="ml-2 text-[10px] text-cyan-200/90">({role.points})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry, index) => (
                    <tr
                      key={entry.playerObjectId}
                      className={index % 2 === 0 ? "bg-slate-900/45" : "bg-slate-900/25"}
                    >
                      <td className="px-4 py-3 font-semibold text-cyan-200">{entry.rank}</td>
                      <td className="px-4 py-3">
                        <RankingPlayerCell
                          playerId={entry.playerId}
                          playerName={entry.playerName}
                          country={entry.country}
                          avatar={entry.avatar}
                          kitImage={entry.kitImage}
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-200">{entry.totalPoints}</td>
                      <td className="px-4 py-3 text-slate-300">{entry.roleCount}</td>
                      {data.roles.map((role) => (
                        <td
                          key={`${entry.playerObjectId}-${role.roleId}`}
                          className="px-4 py-3 text-slate-200"
                        >
                          <RoleHitTooltip
                            value={entry.roleHits[role.roleId] ?? 0}
                            roleNames={entry.roleHitNames[role.roleId] || []}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center text-slate-300">
              No ranked players yet. Assign role points and roles to build the leaderboard.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
