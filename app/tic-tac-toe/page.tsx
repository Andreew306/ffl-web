import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { TicTacToeHome } from "@/components/tictactoe/tictactoe-home"
import { getTicTacToePageData } from "@/lib/services/tictactoe.service"

export default async function TicTacToePage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.discordId) {
    await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  }

  const data = await getTicTacToePageData(session?.user?.discordId ?? null)

  return <TicTacToeHome {...data} />
}
