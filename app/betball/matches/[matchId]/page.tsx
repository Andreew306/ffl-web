import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { getBetBallMatchDetail } from "@/lib/services/betball.service"
import { BetBallMatchView } from "@/components/betball/betball-match-view"

type BetBallMatchPageProps = {
  params: Promise<{ matchId: string }>
}

export default async function BetBallMatchPage({ params }: BetBallMatchPageProps) {
  const { matchId } = await params
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const match = await getBetBallMatchDetail(matchId)
  if (!match) {
    notFound()
  }

  return <BetBallMatchView match={match} fflCoins={session?.user?.betballCoins ?? 0} />
}
