import dbConnect from "@/lib/db/mongoose"
import TeamModel from "@/lib/models/Team"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import GoalModel from "@/lib/models/Goal"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import "@/lib/models/Competition"
import "@/lib/models/Match"
import "@/lib/models/Team"
import "@/lib/models/TeamCompetition"
import "@/lib/models/Player"
import "@/lib/models/PlayerCompetition"
import "@/lib/models/Goal"
import { notFound } from "next/navigation"
import TeamStatsTabs from "./TeamStatsTabs"

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function formatCompetitionLabel(competition: {
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
}) {
  const seasonRaw = competition.season_id ?? competition.season
  const season = seasonRaw === undefined || seasonRaw === null ? "" : String(seasonRaw)
  const division = competition.division
  const year = competition.start_date ? new Date(competition.start_date).getFullYear() : undefined

  switch (competition.type) {
    case "league":
      if (season && division) return `Season ${season}, div ${division}`
      if (season) return `Season ${season}`
      break
    case "cup":
      if (season) return `Season ${season}, Cup`
      return "Cup"
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "supercup":
      if (season) return `Season ${season}, Supercup`
      return "Supercup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return "Competition"
}

function formatMatchCompetitionLabel(competition: {
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
  name?: string
}) {
  if (!competition) return ""
  const seasonRaw = competition.season_id ?? competition.season
  const season = seasonRaw === undefined || seasonRaw === null ? "" : String(seasonRaw)
  const division = competition.division
  const year = competition.start_date ? new Date(competition.start_date).getFullYear() : undefined

  switch (competition.type) {
    case "league":
      if (season && division) return `Season ${season} - Div ${division}`
      if (season) return `Season ${season}`
      break
    case "cup":
      if (season) return `Season ${season} - Cup`
      return "Cup"
    case "supercup":
      if (season) return `Season ${season} - Supercup`
      return "Supercup"
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return competition.name || "Competition"
}

export default async function TeamPage({ params }: { params: { id: string } }) {
  const numericId = Number(params.id)
  await dbConnect()

  const team =
    (Number.isFinite(numericId) && (await TeamModel.findOne({ team_id: numericId }).lean())) ||
    (await TeamModel.findById(params.id).lean())

  if (!team) {
    return notFound()
  }

  const teamCompetitions = await TeamCompetitionModel.find({ team_id: team._id })
    .populate("competition_id")
    .lean()

  const buildStatsFromRow = (row: any) => ({
    matchesPlayed: row.matches_played ?? row.matchesPlayed ?? 0,
    matchesWon: row.matches_won ?? row.matchesWon ?? 0,
    matchesDraw: row.matches_draw ?? row.matchesDraw ?? 0,
    matchesLost: row.matches_lost ?? row.matchesLost ?? 0,
    goalsScored: row.goals_scored ?? row.goalsScored ?? 0,
    goalsConceded: row.goals_conceded ?? row.goalsConceded ?? 0,
    saves: row.saves ?? 0,
    cs: row.cs ?? 0,
    points: row.points ?? 0,
    possessionAvg: row.possession_avg ?? row.possessionAvg ?? 0,
    kicks: row.kicks ?? 0,
    passes: row.passes ?? 0,
    shotsOnGoal: row.shots_on_goal ?? row.shotsOnGoal ?? 0,
  })

  const aggregateStats = (rows: any[]) => {
    const totals = rows.reduce(
      (acc, row) => {
        const stats = buildStatsFromRow(row)
        acc.matchesPlayed += stats.matchesPlayed
        acc.matchesWon += stats.matchesWon
        acc.matchesDraw += stats.matchesDraw
        acc.matchesLost += stats.matchesLost
        acc.goalsScored += stats.goalsScored
        acc.goalsConceded += stats.goalsConceded
        acc.saves += stats.saves
        acc.cs += stats.cs
        acc.points += stats.points
        acc.possessionTotal += stats.possessionAvg * stats.matchesPlayed
        acc.kicks += stats.kicks
        acc.passes += stats.passes
        acc.shotsOnGoal += stats.shotsOnGoal
        return acc
      },
      {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesDraw: 0,
        matchesLost: 0,
        goalsScored: 0,
        goalsConceded: 0,
        saves: 0,
        cs: 0,
        points: 0,
        possessionTotal: 0,
        kicks: 0,
        passes: 0,
        shotsOnGoal: 0,
      }
    )

    const possessionAvg = totals.matchesPlayed
      ? totals.possessionTotal / totals.matchesPlayed
      : 0
    return {
      matchesPlayed: totals.matchesPlayed,
      matchesWon: totals.matchesWon,
      matchesDraw: totals.matchesDraw,
      matchesLost: totals.matchesLost,
      goalsScored: totals.goalsScored,
      goalsConceded: totals.goalsConceded,
      saves: totals.saves,
      cs: totals.cs,
      points: totals.points,
      possessionAvg,
      kicks: totals.kicks,
      passes: totals.passes,
      shotsOnGoal: totals.shotsOnGoal,
    }
  }

  const totalStats = aggregateStats(teamCompetitions)
  const matchLimits = teamCompetitions.reduce<Record<string, number>>((acc, row: any) => {
    const id = row._id?.toString()
    if (!id) return acc
    acc[id] = row.matches_played ?? row.matchesPlayed ?? 0
    return acc
  }, {})

  const allowedMainTypes = new Set(["league", "summer_cup", "nations_cup"])
  const competitionTabs = teamCompetitions
    .filter((row: any) => allowedMainTypes.has(row.competition_id?.type))
    .sort((a: any, b: any) => {
      const aDate = a.competition_id?.start_date
      const bDate = b.competition_id?.start_date
      const aTime = aDate ? new Date(aDate).getTime() : 0
      const bTime = bDate ? new Date(bDate).getTime() : 0
      return bTime - aTime
    })
    .map((row: any) => {
      const competition = row.competition_id
      const tab: {
        id: string
        label: string
        stats: ReturnType<typeof buildStatsFromRow>
        seasonFilters?: Record<string, ReturnType<typeof buildStatsFromRow>>
        seasonFilterIds?: {
          all: string[]
          league: string[]
          cup: string[]
          supercup: string[]
        }
        teamCompetitionId?: string
      } = {
        id: row._id?.toString() || `${competition?._id?.toString() || row.team_competition_id}`,
        label: competition ? formatCompetitionLabel(competition) : "Competition",
        stats: buildStatsFromRow(row),
        teamCompetitionId: row._id?.toString() || "",
      }

      if (competition?.type === "league") {
        const seasonIdRaw = competition?.season_id ?? competition?.season
        const seasonId = seasonIdRaw === undefined || seasonIdRaw === null ? "" : String(seasonIdRaw)
        if (!seasonId) return tab
        const seasonRows = teamCompetitions.filter((item: any) => {
          const itemCompetition = item.competition_id
          const itemSeasonRaw = itemCompetition?.season_id ?? itemCompetition?.season
          const itemSeason =
            itemSeasonRaw === undefined || itemSeasonRaw === null ? "" : String(itemSeasonRaw)
          return itemSeason === seasonId && ["league", "cup", "supercup"].includes(itemCompetition?.type)
        })

        const leagueRows = seasonRows.filter(
          (item: any) => item.competition_id?.type === "league"
        )
        const cupRows = seasonRows.filter(
          (item: any) => item.competition_id?.type === "cup"
        )
        const supercupRows = seasonRows.filter(
          (item: any) => item.competition_id?.type === "supercup"
        )

        tab.seasonFilters = {
          all: aggregateStats(seasonRows),
          league: aggregateStats(leagueRows),
          cup: aggregateStats(cupRows),
          supercup: aggregateStats(supercupRows),
        }
        tab.seasonFilterIds = {
          all: seasonRows.map((item: any) => item._id?.toString()).filter(Boolean),
          league: leagueRows.map((item: any) => item._id?.toString()).filter(Boolean),
          cup: cupRows.map((item: any) => item._id?.toString()).filter(Boolean),
          supercup: supercupRows.map((item: any) => item._id?.toString()).filter(Boolean),
        }
      }

      return tab
    })

  const teamCompetitionObjectIds = teamCompetitions.map((row: any) => row._id).filter(Boolean)

  const matchStatsRows = teamCompetitionObjectIds.length
    ? await TeamMatchStatsModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({
          path: "match_id",
          select: "date competition_id team1_competition_id team2_competition_id score_team1 score_team2",
          populate: [
            { path: "team1_competition_id", populate: { path: "team_id" } },
            { path: "team2_competition_id", populate: { path: "team_id" } },
            {
              path: "competition_id",
              select: "type season_id season division start_date name",
            },
          ],
        })
        .lean()
    : []
  const playerMatchStatsRows = teamCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({
          path: "player_competition_id",
          populate: { path: "player_id" },
        })
        .lean()
    : []

  const readMatchStat = (row: any, snakeKey: string, camelKey?: string) => {
    if (row?.[snakeKey] !== undefined) return row[snakeKey] || 0
    if (camelKey && row?.[camelKey] !== undefined) return row[camelKey] || 0
    return 0
  }

  const matchSeries = matchStatsRows
    .map((row: any) => {
      const match = row.match_id
      const matchDate = match?.date ? new Date(match.date).toISOString() : ""
      const competitionLabel = match?.competition_id
        ? formatMatchCompetitionLabel(match.competition_id)
        : ""
      const team1CompetitionId = match?.team1_competition_id?._id?.toString()
      const team2CompetitionId = match?.team2_competition_id?._id?.toString()
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      const teamA =
        match?.team1_competition_id?.team_id?.teamName ||
        match?.team1_competition_id?.team_id?.team_name ||
        "Team A"
      const teamB =
        match?.team2_competition_id?.team_id?.teamName ||
        match?.team2_competition_id?.team_id?.team_name ||
        "Team B"
      const teamAImage = match?.team1_competition_id?.team_id?.image || ""
      const teamBImage = match?.team2_competition_id?.team_id?.image || ""
      const scoreA = Number(match?.score_team1 ?? 0)
      const scoreB = Number(match?.score_team2 ?? 0)
      const isTeam1 = team1CompetitionId && team1CompetitionId === teamCompetitionId
      const isTeam2 = team2CompetitionId && team2CompetitionId === teamCompetitionId
      const teamScore = isTeam1 ? scoreA : isTeam2 ? scoreB : 0
      const opponentScore = isTeam1 ? scoreB : isTeam2 ? scoreA : 0
      const outcome =
        teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "draw"
      const matchLabel = `${teamA} - ${teamB}`
      if (!matchDate || !teamCompetitionId) return null
      return {
        matchId: match?._id?.toString() || "",
        teamCompetitionId,
        competitionType: match?.competition_id?.type || "",
        date: matchDate,
        matchLabel,
        competitionLabel,
        teamA,
        teamB,
        teamAImage,
        teamBImage,
        scoreA,
        scoreB,
        outcome,
        stats: {
          goalsScored: readMatchStat(row, "goals_scored", "goalsScored"),
          goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded"),
          saves: readMatchStat(row, "saves", "saves"),
          cs: readMatchStat(row, "cs", "cs"),
          points: readMatchStat(row, "points", "points"),
          possessionAvg: readMatchStat(row, "possession", "possession"),
          kicks: readMatchStat(row, "kicks", "kicks"),
          passes: readMatchStat(row, "passes", "passes"),
          shotsOnGoal: readMatchStat(row, "shots_on_goal", "shotsOnGoal"),
          matchesPlayed: 1,
          matchesWon: row.won ? 1 : 0,
          matchesDraw: row.draw ? 1 : 0,
          matchesLost: row.lost ? 1 : 0,
        },
      }
    })
    .filter(Boolean)

  const goalsByOpponent = matchStatsRows
    .map((row: any) => {
      const match = row.match_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!match || !teamCompetitionId) return null
      const team1 = match.team1_competition_id
      const team2 = match.team2_competition_id
      if (!team1 || !team2) return null
      const opponentCompetition =
        team1._id?.toString() === teamCompetitionId
          ? team2
          : team2._id?.toString() === teamCompetitionId
            ? team1
            : null
      if (!opponentCompetition) return null
      const opponent = opponentCompetition.team_id
      return {
        teamCompetitionId,
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId: match._id?.toString() || "",
        goalsScored: readMatchStat(row, "goals_scored", "goalsScored"),
      }
    })
    .filter(Boolean)
  const goalsConcededByOpponent = matchStatsRows
    .map((row: any) => {
      const match = row.match_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!match || !teamCompetitionId) return null
      const team1 = match.team1_competition_id
      const team2 = match.team2_competition_id
      if (!team1 || !team2) return null
      const opponentCompetition =
        team1._id?.toString() === teamCompetitionId
          ? team2
          : team2._id?.toString() === teamCompetitionId
            ? team1
            : null
      if (!opponentCompetition) return null
      const opponent = opponentCompetition.team_id
      return {
        teamCompetitionId,
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId: match._id?.toString() || "",
        goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded"),
      }
    })
    .filter(Boolean)
  const topScorers = playerMatchStatsRows
    .map((row: any) => {
      const player = row.player_competition_id?.player_id
      const playerCompetitionId = row.player_competition_id?._id?.toString() || ""
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!player || !playerCompetitionId || !teamCompetitionId) return null
      return {
        teamCompetitionId,
        playerId: player._id?.toString() || "",
        playerName: player.player_name || "Player",
        playerAvatar: player.avatar || "",
        goals: row.goals || 0,
      }
    })
    .filter(Boolean)
  const teamCompetitionIds = teamCompetitionObjectIds.map((id) => id.toString())
  const concededScorerGoals = teamCompetitionIds.length
    ? await GoalModel.find({ match_id: { $ne: null } })
        .populate({ path: "scorer_id", populate: { path: "player_id" } })
        .populate({
          path: "match_id",
          select: "team1_competition_id team2_competition_id",
        })
        .populate({
          path: "team_competition_id",
        })
        .lean()
    : []
  const concedingScorers = concededScorerGoals
    .map((row: any) => {
      const scorer = row.scorer_id?.player_id
      const scorerCompetitionId = row.scorer_id?._id?.toString() || ""
      const match = row.match_id
      const scoringTeamCompetitionId = row.team_competition_id?._id?.toString() || row.team_competition_id?.toString() || ""
      if (!scorer || !scorerCompetitionId || !match || !scoringTeamCompetitionId) return null
      const team1 = match.team1_competition_id?._id?.toString() || match.team1_competition_id?.toString()
      const team2 = match.team2_competition_id?._id?.toString() || match.team2_competition_id?.toString()
      if (!team1 || !team2) return null
      const opponentTeamCompetitionId =
        scoringTeamCompetitionId === team1 ? team2 : scoringTeamCompetitionId === team2 ? team1 : ""
      if (!opponentTeamCompetitionId || !teamCompetitionIds.includes(opponentTeamCompetitionId)) return null
      return {
        teamCompetitionId: opponentTeamCompetitionId,
        playerId: scorer._id?.toString() || "",
        playerName: scorer.player_name || "Player",
        playerAvatar: scorer.avatar || "",
        goals: 1,
      }
    })
    .filter(Boolean)
  const playerMatchStatsForTeam = teamCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({
          path: "player_competition_id",
          populate: { path: "player_id" },
        })
        .lean()
    : []
  const matchesByPlayer = playerMatchStatsForTeam
    .map((row: any) => {
      const player = row.player_competition_id?.player_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!player || !teamCompetitionId) return null
      return {
        teamCompetitionId,
        playerId: player._id?.toString() || "",
        playerName: player.player_name || "Player",
        playerAvatar: player.avatar || "",
        matchesPlayed: 1,
      }
    })
    .filter(Boolean)
  const rosterRows = teamCompetitionObjectIds.length
    ? await PlayerCompetitionModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({ path: "player_id" })
        .lean()
    : []
  const roster = rosterRows
    .map((row: any) => {
      const player = row.player_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!player || !teamCompetitionId) return null
      return {
        teamCompetitionId,
        playerId: player._id?.toString() || "",
        playerName: player.player_name || "Player",
        playerAvatar: player.avatar || "",
        country: player.country || "",
        position: row.position || "",
        matchesPlayed: row.matchesPlayed ?? row.matches_played ?? 0,
      }
    })
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_55%)]" />
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-8 md:p-10">
            <div className="shrink-0 relative">
              {team.image ? (
                <img
                  src={team.image}
                  alt={team.teamName || team.team_name || "Team"}
                  className="h-32 w-32 md:h-36 md:w-36 object-cover rounded-full border-2 border-slate-700 shadow-lg shadow-teal-900/30"
                />
              ) : (
                <div className="h-32 w-32 md:h-36 md:w-36 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-sm text-gray-400">
                  No logo
                </div>
              )}
              {team.country ? (
                <img
                  src={getTwemojiUrl(team.country)}
                  alt={team.country}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full ring-2 ring-slate-900 bg-slate-900"
                />
              ) : null}
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Team</p>
              <h1 className="text-3xl md:text-4xl font-semibold">
                {team.teamName || team.team_name || "Team"}
              </h1>
              <div className="inline-flex items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
                <span>{team.country || "N/A"}</span>
              </div>
            </div>
          </div>
        </section>

        <TeamStatsTabs
          tabs={competitionTabs}
          totalStats={totalStats}
          matchSeries={matchSeries}
          matchLimits={matchLimits}
          goalsByOpponent={goalsByOpponent}
          goalsConcededByOpponent={goalsConcededByOpponent}
          topScorers={topScorers}
          concedingScorers={concedingScorers}
          matchesByPlayer={matchesByPlayer}
          roster={roster}
        />
      </div>
    </div>
  )
}
