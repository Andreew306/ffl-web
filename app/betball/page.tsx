import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { BetBallHome } from "@/components/betball/betball-home"
import { getBetBallData, getBetBallUserSnapshot } from "@/lib/services/betball.service"

export default async function BetBallPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; created?: string }>
}) {
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const params = await searchParams
  const competitions = await getBetBallData()
  const snapshot = await getBetBallUserSnapshot(session?.user?.discordId ?? null)

  return (
    <BetBallHome
      competitions={competitions}
      fflCoins={snapshot.fflCoins}
      myBets={snapshot.myBets}
      initialTab={params?.tab === "my-bets" ? "my-bets" : "fixtures"}
      createdSlipId={typeof params?.created === "string" ? params.created : ""}
    />
  )
}
