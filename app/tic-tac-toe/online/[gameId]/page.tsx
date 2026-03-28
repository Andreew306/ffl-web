import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { getTicTacToeOnlineGameSummary } from "@/lib/services/tictactoe.service"
import { TicTacToeOnlineGame } from "@/components/tictactoe/tictactoe-online-game"

type PageProps = {
  params: {
    gameId: string
  }
}

export default async function TicTacToeOnlineGamePage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/tic-tac-toe")
  }

  await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  const game = await getTicTacToeOnlineGameSummary(params.gameId, session.user.discordId)

  if (!game) {
    redirect("/tic-tac-toe")
  }

  return <TicTacToeOnlineGame game={game} />
}
