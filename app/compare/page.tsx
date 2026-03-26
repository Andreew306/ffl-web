import { getServerSession } from "next-auth"
import { CompareHome } from "@/components/compare/compare-home"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { getComparePageData, type ComparePosition } from "@/lib/services/compare.service"

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<{ players?: string; competition?: string; position?: string }>
}) {
  const params = (await searchParams) ?? {}
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const data = await getComparePageData({
    playerIds: params.players ? params.players.split(",") : [],
    competitionId: params.competition ?? null,
    position: (params.position as ComparePosition | undefined) ?? "all",
  })

  return <CompareHome {...data} />
}
