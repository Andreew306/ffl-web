import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { FantasyHome } from "@/components/fantasy/fantasy-home"
import { getFantasyDashboardData, getLatestLeagueCompetitionOptions } from "@/lib/services/fantasy.service"

type FantasyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function FantasyPage({ searchParams }: FantasyPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/fantasy")
  }

  await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  const resolvedSearchParams = (await searchParams) ?? {}
  const [dashboard, competitions] = await Promise.all([
    getFantasyDashboardData(session.user.discordId),
    getLatestLeagueCompetitionOptions(),
  ])

  return (
    <FantasyHome
      created={readParam(resolvedSearchParams, "created")}
      joined={readParam(resolvedSearchParams, "joined")}
      error={readParam(resolvedSearchParams, "error")}
      leagues={dashboard.leagues.map((league) => ({
        id: league.id,
        name: league.name,
        teamName: league.teamName,
        role: league.role,
        leagueType: league.leagueType,
      }))}
      competitions={competitions}
    />
  )
}
