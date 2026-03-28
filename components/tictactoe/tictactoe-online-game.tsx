import Link from "next/link"
import Image from "next/image"
import { Clock, Swords } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TicTacToeOnlineGameSummary } from "@/lib/services/tictactoe.service"

type TicTacToeOnlineGameProps = {
  game: TicTacToeOnlineGameSummary
}

export function TicTacToeOnlineGame({ game }: TicTacToeOnlineGameProps) {
  const turnLabel = game.isYourTurn ? "Your turn" : "Opponent's turn"
  const difficultyLabel = game.difficulty ? game.difficulty.toUpperCase() : "RANDOM"

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/tic-tac-toe"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Back to Tic Tac Toe
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-100">
            <Swords className="h-4 w-4" />
            Online match
          </div>
        </div>

        <Card className="border-white/10 bg-slate-900/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Match created</CardTitle>
                <div className="mt-2 text-sm text-slate-400">
                  Difficulty: <span className="text-slate-200">{difficultyLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200">
                <Clock className="h-4 w-4 text-cyan-200" />
                {turnLabel}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
              <div className="text-sm text-slate-300">Opponent</div>
              <div className="flex items-center gap-3">
                {game.opponent.avatar ? (
                  <Image
                    src={game.opponent.avatar}
                    alt={game.opponent.displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                    {game.opponent.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="text-sm font-semibold text-white">{game.opponent.displayName}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300">
              The online match is ready. Gameplay UI will appear here next. For now, refresh if you don&apos;t see the turn update.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
