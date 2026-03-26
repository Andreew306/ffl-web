import { getDailyWordleLeaderboard, getDailyWordlePlayer } from "@/lib/services/wordle.service"
import { WordleHome } from "@/components/wordle/wordle-home"

export default async function WordlePage() {
  const [daily, leaderboard] = await Promise.all([
    getDailyWordlePlayer(),
    getDailyWordleLeaderboard(),
  ])

  return (
    <WordleHome
      daily={daily}
      leaderboard={leaderboard}
    />
  )
}
