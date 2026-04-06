import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { getBetBallMatchDetail } from "@/lib/services/betball.service"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
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

  await dbConnect()
  const match = await getBetBallMatchDetail(matchId)
  const user = session?.user?.discordId
    ? await UserModel.findOne({ discordId: session.user.discordId })
        .select("betballCoins")
        .lean<{ betballCoins?: number } | null>()
    : null
  if (!match) {
    notFound()
  }

  return <BetBallMatchView match={match} fflCoins={Number(user?.betballCoins ?? session?.user?.betballCoins ?? 0)} />
}
