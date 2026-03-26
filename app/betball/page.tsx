import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { BetBallHome } from "@/components/betball/betball-home"
import { getBetBallData } from "@/lib/services/betball.service"

export default async function BetBallPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const competitions = await getBetBallData()

  return <BetBallHome competitions={competitions} fflCoins={session?.user?.betballCoins ?? 0} />
}
