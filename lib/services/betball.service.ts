import mongoose from "mongoose"
import { unstable_cache } from "next/cache"
import dbConnect from "@/lib/db/mongoose"
import CompetitionModel from "@/lib/models/Competition"
import MatchModel from "@/lib/models/Match"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import { normalizeTeamImageUrl } from "@/lib/utils"

export type BetBallOdds = {
  home: number
  draw: number
  away: number
}

export type BetBallMatch = {
  id: string
  matchId: number
  week: number
  matchday: number | null
  matchdayLabel: string
  date: string
  team1Name: string
  team1Image?: string
  team2Name: string
  team2Image?: string
  scoreTeam1: number
  scoreTeam2: number
  comments: string
  odds: BetBallOdds
}

export type BetBallWeek = {
  week: number
  label: string
  matchdays: Array<{
    label: string
    matchday: number | null
    matches: BetBallMatch[]
  }>
}

export type BetBallCompetition = {
  id: string
  competitionId: string
  name: string
  label: string
  season: number
  division: number | null
  weeks: BetBallWeek[]
}

export type BetBallMatchDetail = {
  id: string
  matchId: number
  competitionLabel: string
  week: number
  matchday: number | null
  matchdayLabel: string
  date: string
  comments: string
  team1Name: string
  team1Image?: string
  team2Name: string
  team2Image?: string
  scoreTeam1: number
  scoreTeam2: number
  odds: BetBallOdds
  analysis: {
    projectedGoals: {
      home: number
      away: number
      total: number
    }
    exactScoreHistory: {
      sampleSize: number
      frequencies: Record<string, number>
    }
    markets: {
      result: BetBallMarketOption[]
      mercy: BetBallMarketOption[]
      goals: BetBallMarketOption[]
      exactTotalGoals: BetBallMarketOption[]
      bothTeamsToScore: BetBallMarketOption[]
      cleanSheet: BetBallMarketOption[]
      firstScorer: BetBallMarketOption[]
      topScorer: BetBallMarketOption[]
      anytimeScorer: BetBallMarketOption[]
      anytimeAssist: BetBallMarketOption[]
      goalOrAssist: BetBallMarketOption[]
      playerGoalLines: BetBallMarketOption[]
    }
    teams: [BetBallAnalysisTeam, BetBallAnalysisTeam]
  }
}

export type BetBallMarketOption = {
  id: string
  token: string
  label: string
  description: string
  odds: number
  category:
    | "result"
    | "mercy"
    | "goals"
    | "exact-total-goals"
    | "exact-score"
    | "clean-sheet"
    | "scorer"
    | "btts"
    | "first-scorer"
    | "top-scorer"
    | "player-goals"
}

export type BetBallAnalysisPlayer = {
  playerId: number
  playerName: string
  country?: string
  avatar?: string
  kitImage?: string
  kitTextColor?: string
  goals: number
  assists: number
  preassists: number
  matchesPlayed: number
  shotsOnGoal: number
  avg: number
  odds: number
  assistOdds: number
  goalOrAssistOdds: number
}

export type BetBallAnalysisTeam = {
  side: "home" | "away"
  name: string
  image?: string
  stats: {
    pointsPerMatch: number
    goalsPerMatch: number
    concededPerMatch: number
    cleanSheetRate: number
    winRate: number
  }
  scorerMarkets: BetBallMarketOption[]
  topScorers: BetBallAnalysisPlayer[]
}

function extractMatchdayFromComments(comments?: string | null) {
  const match = comments?.match(/MD\s*0*(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function toSafeIsoDate(value?: Date | string | number | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString()
}

function toOdds(probability: number) {
  const safeProbability = Math.min(0.88, Math.max(0.08, probability))
  const margin = 1.08
  return Math.round((margin / safeProbability) * 100) / 100
}

function buildOdds(
  homeStrength: number,
  awayStrength: number,
  homeWinRate = 0.5,
  awayWinRate = 0.5,
  homePlayerWinRate = 0.5,
  awayPlayerWinRate = 0.5
): BetBallOdds {
  const diff =
    (homeStrength - awayStrength)
    + (homeWinRate - awayWinRate) * 1.2
    + (homePlayerWinRate - awayPlayerWinRate) * 0.8
  const homeBase = 1.18 + Math.max(-0.42, Math.min(0.42, diff * 0.34))
  const awayBase = 1.18 - Math.max(-0.42, Math.min(0.42, diff * 0.34))
  const drawBase = 0.94 - Math.min(0.32, Math.abs(diff) * 0.18)

  const total = homeBase + awayBase + drawBase
  const homeProbability = homeBase / total
  const drawProbability = drawBase / total
  const awayProbability = awayBase / total

  return {
    home: toOdds(homeProbability),
    draw: toOdds(drawProbability),
    away: toOdds(awayProbability),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toDecimalOddsFromProbability(probability: number) {
  return toOdds(clamp(probability, 0.06, 0.88))
}

function factorial(value: number) {
  if (value <= 1) return 1
  let result = 1
  for (let index = 2; index <= value; index += 1) {
    result *= index
  }
  return result
}

function poissonProbability(lambda: number, goals: number) {
  const safeLambda = Math.max(0.05, lambda)
  return Math.exp(-safeLambda) * (safeLambda ** goals) / factorial(goals)
}

function getProjectedGoals(homeTeam: TeamSummary | null, awayTeam: TeamSummary | null) {
  const homeScored = homeTeam?.stats.goalsPerMatch ?? 1.4
  const awayScored = awayTeam?.stats.goalsPerMatch ?? 1.4
  const homeConceded = homeTeam?.stats.concededPerMatch ?? 1.2
  const awayConceded = awayTeam?.stats.concededPerMatch ?? 1.2

  const home = clamp(homeScored * 0.58 + awayConceded * 0.42, 0.35, 5.6)
  const away = clamp(awayScored * 0.58 + homeConceded * 0.42, 0.35, 5.6)

  return {
    home,
    away,
    total: home + away,
  }
}

function getNumericValue<T extends Record<string, unknown>>(row: T | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return 0
}

function buildTotalGoalsMarkets(homeTeam: TeamSummary | null, awayTeam: TeamSummary | null): BetBallMarketOption[] {
  const projected = getProjectedGoals(homeTeam, awayTeam)
  const lines = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5]

  return lines.flatMap((line) => {
    const threshold = Math.floor(line + 0.5)
    let underProbability = 0
    for (let goals = 0; goals < threshold; goals += 1) {
      underProbability += poissonProbability(projected.total, goals)
    }
    underProbability = clamp(underProbability, 0.06, 0.94)
    const overProbability = clamp(1 - underProbability, 0.06, 0.94)

    return [
      {
        id: `goals-over-${String(line).replace(".", "-")}`,
        token: `O${line}`,
        label: `Over ${line} goals`,
        description: `${threshold} or more goals in the match`,
        odds: toDecimalOddsFromProbability(overProbability),
        category: "goals" as const,
      },
      {
        id: `goals-under-${String(line).replace(".", "-")}`,
        token: `U${line}`,
        label: `Under ${line} goals`,
        description: `${threshold - 1} goals or fewer in the match`,
        odds: toDecimalOddsFromProbability(underProbability),
        category: "goals" as const,
      },
    ]
  })
}

function buildExactTotalGoalsMarkets(homeTeam: TeamSummary | null, awayTeam: TeamSummary | null): BetBallMarketOption[] {
  const projected = getProjectedGoals(homeTeam, awayTeam)
  const totals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

  const options = totals.map((totalGoals) => ({
    id: `exact-total-${totalGoals}`,
    token: `T${totalGoals}`,
    label: `${totalGoals} ${totalGoals === 1 ? "goal" : "goals"}`,
    description: `Exactly ${totalGoals} total goals`,
    odds: toDecimalOddsFromProbability(poissonProbability(projected.total, totalGoals)),
    category: "exact-total-goals" as const,
  }))

  return options
}

function buildCleanSheetMarkets(homeTeam: TeamSummary | null, awayTeam: TeamSummary | null): BetBallMarketOption[] {
  const homeProbability = clamp(
    ((homeTeam?.stats.cleanSheetRate ?? 0.15) * 0.6) + (1 - (awayTeam?.stats.goalsPerMatch ?? 1.3) / 3.8) * 0.4,
    0.08,
    0.7
  )
  const awayProbability = clamp(
    ((awayTeam?.stats.cleanSheetRate ?? 0.15) * 0.6) + (1 - (homeTeam?.stats.goalsPerMatch ?? 1.3) / 3.8) * 0.4,
    0.08,
    0.7
  )

  return [
    {
      id: "clean-sheet-home",
      token: "CS1",
      label: `${homeTeam?.name ?? "Home"} clean sheet`,
      description: "Home team to keep a clean sheet",
      odds: toDecimalOddsFromProbability(homeProbability),
      category: "clean-sheet",
    },
    {
      id: "clean-sheet-away",
      token: "CS2",
      label: `${awayTeam?.name ?? "Away"} clean sheet`,
      description: "Away team to keep a clean sheet",
      odds: toDecimalOddsFromProbability(awayProbability),
      category: "clean-sheet",
    },
  ]
}

function buildBothTeamsToScoreMarkets(homeTeam: TeamSummary | null, awayTeam: TeamSummary | null): BetBallMarketOption[] {
  const homeScoreChance = clamp((homeTeam?.stats.goalsPerMatch ?? 1.2) / 2.8, 0.18, 0.82)
  const awayScoreChance = clamp((awayTeam?.stats.goalsPerMatch ?? 1.2) / 2.8, 0.18, 0.82)
  const yesProbability = clamp(homeScoreChance * awayScoreChance + 0.18, 0.16, 0.8)

  return [
    {
      id: "btts-yes",
      token: "BTTS Y",
      label: "Both teams to score: Yes",
      description: "Both teams score at least one goal",
      odds: toDecimalOddsFromProbability(yesProbability),
      category: "btts",
    },
    {
      id: "btts-no",
      token: "BTTS N",
      label: "Both teams to score: No",
      description: "At least one team fails to score",
      odds: toDecimalOddsFromProbability(1 - yesProbability),
      category: "btts",
    },
  ]
}

function buildMercyMarkets(
  homeTeam: TeamSummary | null,
  awayTeam: TeamSummary | null,
  homeMercyRate: number,
  awayMercyRate: number
) {
  const homeAttack = homeTeam?.stats.goalsPerMatch ?? 1.4
  const awayAttack = awayTeam?.stats.goalsPerMatch ?? 1.4
  const homeProbability = clamp(homeMercyRate * 0.62 + (homeAttack / Math.max(0.8, awayAttack)) * 0.08, 0.02, 0.45)
  const awayProbability = clamp(awayMercyRate * 0.62 + (awayAttack / Math.max(0.8, homeAttack)) * 0.08, 0.02, 0.45)

  return [
    {
      id: "mercy-home",
      token: "M1",
      label: `${homeTeam?.name ?? "Home"} by mercy`,
      description: "Home team wins by 7 or more goals",
      odds: toDecimalOddsFromProbability(homeProbability),
      category: "mercy" as const,
    },
    {
      id: "mercy-away",
      token: "M2",
      label: `${awayTeam?.name ?? "Away"} by mercy`,
      description: "Away team wins by 7 or more goals",
      odds: toDecimalOddsFromProbability(awayProbability),
      category: "mercy" as const,
    },
  ]
}

function buildCombinedScorerMarkets(home: BetBallAnalysisTeam, away: BetBallAnalysisTeam) {
  const combined = [home, away].flatMap((team) =>
    team.topScorers.map((player, index) => ({
      teamName: team.name,
      baseOdds: team.scorerMarkets[index]?.odds ?? player.odds,
      player,
    }))
  )

  const ranked = combined
    .sort((a, b) => {
      if (b.player.goals !== a.player.goals) return b.player.goals - a.player.goals
      if (b.player.shotsOnGoal !== a.player.shotsOnGoal) return b.player.shotsOnGoal - a.player.shotsOnGoal
      return b.player.avg - a.player.avg
    })
    .slice(0, 8)

  return {
    firstScorer: ranked.slice(0, 6).map(({ player, teamName, baseOdds }) => ({
      id: `first-scorer-${player.playerId}`,
      token: "FG",
      label: `${player.playerName} first scorer`,
      description: `First goalscorer for ${teamName}`,
      odds: Math.round(baseOdds * 1.28 * 100) / 100,
      category: "first-scorer" as const,
    })),
    topScorer: ranked.slice(0, 6).map(({ player, teamName, baseOdds }) => ({
      id: `top-scorer-${player.playerId}`,
      token: "MG",
      label: `${player.playerName} top scorer`,
      description: `Most goals in the match for ${teamName}`,
      odds: Math.round(baseOdds * 1.55 * 100) / 100,
      category: "top-scorer" as const,
    })),
    anytimeScorer: ranked.slice(0, 8).map(({ player, teamName, baseOdds }) => ({
      id: `anytime-scorer-${player.playerId}`,
      token: "AG",
      label: `${player.playerName} to score`,
      description: `Anytime goalscorer for ${teamName}`,
      odds: baseOdds,
      category: "scorer" as const,
    })),
    anytimeAssist: ranked.slice(0, 8).map(({ player, teamName }) => ({
      id: `anytime-assist-${player.playerId}`,
      token: "AS",
      label: `${player.playerName} to assist`,
      description: `Anytime assist for ${teamName}`,
      odds: player.assistOdds,
      category: "scorer" as const,
    })),
    goalOrAssist: ranked.slice(0, 8).map(({ player, teamName }) => ({
      id: `goal-assist-${player.playerId}`,
      token: "G/A",
      label: `${player.playerName} goal or assist`,
      description: `Any goal or assist contribution for ${teamName}`,
      odds: player.goalOrAssistOdds,
      category: "scorer" as const,
    })),
    playerGoalLines: ranked.slice(0, 6).flatMap(({ player, teamName, baseOdds }) => ([
      {
        id: `player-over-${player.playerId}`,
        token: "O0.5",
        label: `${player.playerName} over 0.5 goals`,
        description: `${player.playerName} scores at least once for ${teamName}`,
        odds: baseOdds,
        category: "player-goals" as const,
      },
      {
        id: `player-under-${player.playerId}`,
        token: "U0.5",
        label: `${player.playerName} under 0.5 goals`,
        description: `${player.playerName} does not score for ${teamName}`,
        odds: toDecimalOddsFromProbability(clamp(1 - 1 / baseOdds, 0.16, 0.84)),
        category: "player-goals" as const,
      },
    ])),
  }
}

type TeamSummary = {
  name: string
  image?: string
  kitImage?: string
  kitTextColor?: string
  strength: number
  playerWinRate: number
  stats: {
    pointsPerMatch: number
    goalsPerMatch: number
    concededPerMatch: number
    cleanSheetRate: number
    winRate: number
  }
}

function getCompetitionStrength(row?: {
  points?: number
  matches_played?: number
  goals_scored?: number
  goals_conceded?: number
  possession_avg?: number
  shots_on_goal?: number
}) {
  const matchesPlayed = Math.max(1, Number(row?.matches_played ?? 0))
  const points = Number(row?.points ?? 0)
  const goalsScored = Number(row?.goals_scored ?? 0)
  const goalsConceded = Number(row?.goals_conceded ?? 0)
  const possession = Number(row?.possession_avg ?? 50)
  const shotsOnGoal = Number(row?.shots_on_goal ?? 0)

  const pointsPerMatch = points / matchesPlayed
  const goalDiffPerMatch = (goalsScored - goalsConceded) / matchesPlayed
  const shotsPerMatch = shotsOnGoal / matchesPlayed
  const possessionDelta = (possession - 50) / 10

  return pointsPerMatch * 0.7 + goalDiffPerMatch * 0.55 + shotsPerMatch * 0.18 + possessionDelta * 0.12
}

function getWeightedAverage(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

async function getLatestLeagueCompetitionRows() {
  const competitions = await CompetitionModel.collection
    .find(
      { type: "league" },
      { projection: { _id: 1, competition_id: 1, name: 1, season: 1, year: 1, division: 1 } }
    )
    .toArray() as Array<{
      _id: mongoose.Types.ObjectId
      competition_id: string
      name?: string
      season?: number
      year?: number
      division?: number | null
    }>

  if (!competitions.length) {
    return []
  }

  const highestSeason = competitions.reduce(
    (max, competition) => Math.max(max, Number(competition.season ?? competition.year ?? 0)),
    0
  )

  return competitions
    .filter((competition) => Number(competition.season ?? competition.year ?? 0) === highestSeason)
    .sort((a, b) => Number(a.division ?? 99) - Number(b.division ?? 99))
}

async function getBetBallDataInternal(): Promise<BetBallCompetition[]> {
  await dbConnect()

  const competitions = await getLatestLeagueCompetitionRows()
  if (!competitions.length) {
    return []
  }

  const competitionIds = competitions.map((competition) => competition._id)
  const teamCompetitions = await TeamCompetitionModel.collection
    .find(
      { competition_id: { $in: competitionIds } },
      {
        projection: {
          _id: 1,
          competition_id: 1,
          team_id: 1,
          points: 1,
          matches_played: 1,
          goals_scored: 1,
          goals_conceded: 1,
          possession_avg: 1,
          shots_on_goal: 1,
        },
      }
    )
    .toArray() as Array<{
      _id: mongoose.Types.ObjectId
      competition_id: mongoose.Types.ObjectId
      team_id?: number | mongoose.Types.ObjectId
      points?: number
      matches_played?: number
      goals_scored?: number
      goals_conceded?: number
      possession_avg?: number
      shots_on_goal?: number
    }>

  const rawTeamIds = [...new Set(
    teamCompetitions
      .map((item) => item.team_id)
      .filter((value): value is number | mongoose.Types.ObjectId => value !== null && value !== undefined)
      .map((value) => String(value))
  )]

  const objectIdTeamIds = rawTeamIds.filter((value) => mongoose.Types.ObjectId.isValid(value)).map((value) => new mongoose.Types.ObjectId(value))
  const numericTeamIds = rawTeamIds.filter((value) => /^\d+$/.test(value)).map((value) => Number(value))

  const teams = objectIdTeamIds.length || numericTeamIds.length
    ? await TeamModel.collection
        .find(
          {
            $or: [
              ...(objectIdTeamIds.length ? [{ _id: { $in: objectIdTeamIds } }] : []),
              ...(numericTeamIds.length ? [{ team_id: { $in: numericTeamIds } }] : []),
            ],
          },
          { projection: { _id: 1, team_id: 1, team_name: 1, image: 1, kits: 1, textColor: 1 } }
        )
        .toArray() as Array<{
          _id: mongoose.Types.ObjectId
          team_id?: number
          team_name?: string
          image?: string
          kits?: string[]
          textColor?: string
        }>
    : []

  const teamByObjectId = new Map(teams.map((team) => [team._id.toString(), team]))
  const teamByNumericId = new Map(
    teams
      .filter((team) => team.team_id !== null && team.team_id !== undefined)
      .map((team) => [String(team.team_id), team])
  )

  const competitionTeamCompetitionMap = new Map(
    teamCompetitions.map((item) => {
      const team = item.team_id instanceof mongoose.Types.ObjectId
        ? teamByObjectId.get(item.team_id.toString())
        : teamByNumericId.get(String(item.team_id))

      return [
        item._id.toString(),
        {
          teamName: team?.team_name ?? "Unknown team",
          teamImage: normalizeTeamImageUrl(team?.image),
          strength: getCompetitionStrength(item),
        },
      ]
    })
  )

  const matches = await MatchModel.find({ competition_id: { $in: competitionIds } })
    .select("competition_id match_id date comments team1_competition_id team2_competition_id score_team1 score_team2")
    .sort({ date: 1, match_id: 1 })
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      competition_id: mongoose.Types.ObjectId
      match_id: number
      date: Date
      comments?: string
      team1_competition_id?: mongoose.Types.ObjectId
      team2_competition_id?: mongoose.Types.ObjectId
      score_team1?: number
      score_team2?: number
    }>>()

  const competitionMap = new Map<string, BetBallCompetition>(
    competitions.map((competition) => [
      competition._id.toString(),
      {
        id: competition._id.toString(),
        competitionId: competition.competition_id,
        name: competition.name?.trim() || `Season ${competition.season} · Division ${competition.division ?? "-"}`,
        label: `Season ${competition.season}${competition.division ? ` · Division ${competition.division}` : ""}`,
        season: Number(competition.season ?? 0),
        division: competition.division ?? null,
        weeks: [],
      },
    ])
  )

  const weekMaps = new Map<string, Map<number, BetBallWeek>>()

  for (const match of matches) {
    const competitionKey = match.competition_id.toString()
    const competition = competitionMap.get(competitionKey)
    if (!competition) continue

    const matchday = extractMatchdayFromComments(match.comments)
    const week = matchday && matchday > 0 ? Math.ceil(matchday / 2) : 1
    const matchdayLabel = matchday ? `MD${matchday}` : "No matchday"

    if (!weekMaps.has(competitionKey)) {
      weekMaps.set(competitionKey, new Map())
    }
    const weekMap = weekMaps.get(competitionKey)!
    if (!weekMap.has(week)) {
      weekMap.set(week, {
        week,
        label: `Week ${week}`,
        matchdays: [],
      })
    }

    const weekEntry = weekMap.get(week)!
    let matchdayEntry = weekEntry.matchdays.find((entry) => entry.matchday === matchday)
    if (!matchdayEntry) {
      matchdayEntry = {
        label: matchdayLabel,
        matchday,
        matches: [],
      }
      weekEntry.matchdays.push(matchdayEntry)
      weekEntry.matchdays.sort((a, b) => (a.matchday ?? 999) - (b.matchday ?? 999))
    }

    const team1 = match.team1_competition_id
      ? competitionTeamCompetitionMap.get(match.team1_competition_id.toString())
      : null
    const team2 = match.team2_competition_id
      ? competitionTeamCompetitionMap.get(match.team2_competition_id.toString())
      : null

    matchdayEntry.matches.push({
      id: match._id.toString(),
      matchId: match.match_id,
      week,
      matchday,
      matchdayLabel,
      date: toSafeIsoDate(match.date),
      team1Name: team1?.teamName ?? "TBD",
      team1Image: team1?.teamImage ?? "",
      team2Name: team2?.teamName ?? "TBD",
      team2Image: team2?.teamImage ?? "",
      scoreTeam1: Number(match.score_team1 ?? 0),
      scoreTeam2: Number(match.score_team2 ?? 0),
      comments: match.comments ?? "",
      odds: buildOdds(team1?.strength ?? 0, team2?.strength ?? 0),
    })
  }

  for (const [competitionKey, weekMap] of weekMaps) {
    const competition = competitionMap.get(competitionKey)
    if (!competition) continue

    competition.weeks = [...weekMap.values()]
      .sort((a, b) => a.week - b.week)
      .map((week) => ({
        ...week,
        matchdays: week.matchdays.map((matchday) => ({
          ...matchday,
          matches: matchday.matches.sort((a, b) => a.matchId - b.matchId),
        })),
      }))
  }

  return [...competitionMap.values()]
}

export const getBetBallData = unstable_cache(
  async () => getBetBallDataInternal(),
  ["betball:data"],
  { revalidate: 300 }
)

export async function getBetBallMatchDetail(matchId: string): Promise<BetBallMatchDetail | null> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    return null
  }

  const match = await MatchModel.findById(matchId)
    .select("competition_id match_id date comments team1_competition_id team2_competition_id score_team1 score_team2")
    .lean<{
      _id: mongoose.Types.ObjectId
      competition_id: mongoose.Types.ObjectId
      match_id: number
      date: Date
      comments?: string
      team1_competition_id?: mongoose.Types.ObjectId
      team2_competition_id?: mongoose.Types.ObjectId
      score_team1?: number
      score_team2?: number
    } | null>()

  if (!match) {
    return null
  }

  const competition = await CompetitionModel.collection.findOne(
    { _id: match.competition_id },
    { projection: { season: 1, division: 1, name: 1 } }
  ) as { season?: number; division?: number | null; name?: string } | null

  const teamCompetitions = await TeamCompetitionModel.collection
    .find(
      {
        _id: {
          $in: [match.team1_competition_id, match.team2_competition_id].filter(
            (value): value is mongoose.Types.ObjectId => Boolean(value)
          ),
        },
      },
      {
        projection: {
          _id: 1,
          team_id: 1,
          points: 1,
          matches_played: 1,
          matches_won: 1,
          goals_scored: 1,
          goals_conceded: 1,
          possession_avg: 1,
          shots_on_goal: 1,
          cs: 1,
        },
      }
    )
    .toArray() as Array<{
      _id: mongoose.Types.ObjectId
      team_id?: number | mongoose.Types.ObjectId
      points?: number
      matches_played?: number
      goals_scored?: number
      goals_conceded?: number
      possession_avg?: number
      shots_on_goal?: number
    }>

  const currentSeason = Number(competition?.season ?? 0)
  const historicalSeasons = [currentSeason, currentSeason - 1, currentSeason - 2].filter((season) => season > 0)
  const historicalLeagueCompetitions = await CompetitionModel.collection
    .find(
      { type: "league", season: { $in: historicalSeasons } },
      { projection: { _id: 1, season: 1 } }
    )
    .toArray() as Array<{ _id: mongoose.Types.ObjectId; season?: number }>
  const historicalCompetitionIds = historicalLeagueCompetitions.map((row) => row._id)

  const historicalTeamCompetitions = historicalCompetitionIds.length
    ? await TeamCompetitionModel.collection
        .find(
          { competition_id: { $in: historicalCompetitionIds } },
          {
            projection: {
              _id: 1,
              competition_id: 1,
              team_id: 1,
              points: 1,
              matches_played: 1,
              matches_won: 1,
              matches_draw: 1,
              matches_lost: 1,
              goals_scored: 1,
              goals_conceded: 1,
              possession_avg: 1,
              shots_on_goal: 1,
              cs: 1,
            },
          }
        )
        .toArray() as Array<{
          _id: mongoose.Types.ObjectId
          competition_id: mongoose.Types.ObjectId
          team_id?: number | mongoose.Types.ObjectId
          points?: number
          matches_played?: number
          matches_won?: number
          matches_draw?: number
          matches_lost?: number
          goals_scored?: number
          goals_conceded?: number
          possession_avg?: number
          shots_on_goal?: number
          cs?: number
        }>
    : []

  const historicalMatches = historicalCompetitionIds.length
    ? await MatchModel.collection
        .find(
          { competition_id: { $in: historicalCompetitionIds } },
          { projection: { score_team1: 1, score_team2: 1 } }
        )
        .toArray() as Array<{
          score_team1?: number
          score_team2?: number
        }>
    : []

  const rawTeamIds = [...new Set(
    teamCompetitions
      .map((item) => item.team_id)
      .filter((value): value is number | mongoose.Types.ObjectId => value !== null && value !== undefined)
      .map((value) => String(value))
  )]

  const objectIdTeamIds = rawTeamIds.filter((value) => mongoose.Types.ObjectId.isValid(value)).map((value) => new mongoose.Types.ObjectId(value))
  const numericTeamIds = rawTeamIds.filter((value) => /^\d+$/.test(value)).map((value) => Number(value))

  const teams = await TeamModel.collection
    .find(
      {
        $or: [
          ...(objectIdTeamIds.length ? [{ _id: { $in: objectIdTeamIds } }] : []),
          ...(numericTeamIds.length ? [{ team_id: { $in: numericTeamIds } }] : []),
        ],
      },
      { projection: { _id: 1, team_id: 1, team_name: 1, image: 1 } }
    )
    .toArray() as Array<{
      _id: mongoose.Types.ObjectId
      team_id?: number
      team_name?: string
      image?: string
      kits?: string[]
      textColor?: string
    }>

  const teamByObjectId = new Map(teams.map((team) => [team._id.toString(), team]))
  const teamByNumericId = new Map(
    teams
      .filter((team) => team.team_id !== null && team.team_id !== undefined)
      .map((team) => [String(team.team_id), team])
  )

  const competitionTeamCompetitionMap = new Map(
    teamCompetitions.map((item) => {
      const team = item.team_id instanceof mongoose.Types.ObjectId
        ? teamByObjectId.get(item.team_id.toString())
        : teamByNumericId.get(String(item.team_id))

      const matchesPlayed = Math.max(1, Number(item.matches_played ?? 0))
      const goalsScored = Number(item.goals_scored ?? 0)
      const goalsConceded = Number(item.goals_conceded ?? 0)
      const cleanSheets = Number((item as { cs?: number }).cs ?? 0)
      const wins = Number((item as { matches_won?: number }).matches_won ?? 0)

      return [
        item._id.toString(),
        {
          teamName: team?.team_name ?? "Unknown team",
          teamImage: normalizeTeamImageUrl(team?.image),
          teamKit: team?.kits?.[0] ?? "",
          teamKitTextColor: team?.textColor ?? "",
          strength: getCompetitionStrength(item),
          stats: {
            pointsPerMatch: Number(item.points ?? 0) / matchesPlayed,
            goalsPerMatch: goalsScored / matchesPlayed,
            concededPerMatch: goalsConceded / matchesPlayed,
            cleanSheetRate: cleanSheets / matchesPlayed,
            winRate: wins / matchesPlayed,
          },
        },
      ]
    })
  )

  const currentTeamIdValues = teamCompetitions
    .map((row) => row.team_id)
    .filter((value): value is number | mongoose.Types.ObjectId => value !== null && value !== undefined)
  const currentTeamIdKeys = new Set(currentTeamIdValues.map((value) => String(value)))
  const teamHistoryMap = new Map<
    string,
    {
      matchesPlayed: number
      wins: number
      draws: number
      goalsScored: number
      goalsConceded: number
      cleanSheets: number
      points: number
      possessions: number[]
      shotsPerMatch: number[]
    }
  >()

  for (const row of historicalTeamCompetitions) {
    const teamKey = row.team_id !== undefined && row.team_id !== null ? String(row.team_id) : ""
    if (!teamKey || !currentTeamIdKeys.has(teamKey)) continue

    const bucket = teamHistoryMap.get(teamKey) ?? {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      goalsScored: 0,
      goalsConceded: 0,
      cleanSheets: 0,
      points: 0,
      possessions: [],
      shotsPerMatch: [],
    }

    const matchesPlayed = Math.max(0, Number(row.matches_played ?? 0))
    bucket.matchesPlayed += matchesPlayed
    bucket.wins += Number(row.matches_won ?? 0)
    bucket.draws += Number(row.matches_draw ?? 0)
    bucket.goalsScored += Number(row.goals_scored ?? 0)
    bucket.goalsConceded += Number(row.goals_conceded ?? 0)
    bucket.cleanSheets += Number(row.cs ?? 0)
    bucket.points += Number(row.points ?? 0)

    if (matchesPlayed > 0) {
      bucket.possessions.push(Number(row.possession_avg ?? 50))
      bucket.shotsPerMatch.push(Number(row.shots_on_goal ?? 0) / matchesPlayed)
    }

    teamHistoryMap.set(teamKey, bucket)
  }

  const team1 = match.team1_competition_id
    ? competitionTeamCompetitionMap.get(match.team1_competition_id.toString())
    : null
  const team2 = match.team2_competition_id
    ? competitionTeamCompetitionMap.get(match.team2_competition_id.toString())
    : null

  const playerCompetitions = await TeamCompetitionModel.db.collection("playercompetitions")
    .find(
      {
        team_competition_id: {
          $in: [match.team1_competition_id, match.team2_competition_id].filter(
            (value): value is mongoose.Types.ObjectId => Boolean(value)
          ),
        },
      },
      {
        projection: {
          player_id: 1,
          team_competition_id: 1,
          goals: 1,
          assists: 1,
          preassists: 1,
          shots_on_goal: 1,
          avg: 1,
          matches_played: 1,
          goalsConceded: 1,
          shotsOnGoal: 1,
          matchesPlayed: 1,
        },
      }
    )
    .toArray() as Array<{
      _id?: mongoose.Types.ObjectId
      player_id?: mongoose.Types.ObjectId
      team_competition_id?: mongoose.Types.ObjectId
      goals?: number
      assists?: number
      preassists?: number
      shots_on_goal?: number
      avg?: number
      matches_played?: number
      goalsConceded?: number
      shotsOnGoal?: number
      matchesPlayed?: number
    }>

  const playerObjectIds = [...new Set(
    playerCompetitions
      .map((row) => row.player_id?.toString())
      .filter((value): value is string => Boolean(value))
  )].map((value) => new mongoose.Types.ObjectId(value))

  const historicalTeamCompetitionIds = historicalTeamCompetitions.map((row) => row._id)
  const historicalPlayerCompetitions = historicalTeamCompetitionIds.length && playerObjectIds.length
    ? await TeamCompetitionModel.db.collection("playercompetitions")
        .find(
          {
            player_id: { $in: playerObjectIds },
            team_competition_id: { $in: historicalTeamCompetitionIds },
          },
          {
            projection: {
              _id: 1,
              player_id: 1,
              team_competition_id: 1,
              goals: 1,
              assists: 1,
              preassists: 1,
              shots_on_goal: 1,
              avg: 1,
              matches_played: 1,
            },
          }
        )
        .toArray() as Array<{
          _id: mongoose.Types.ObjectId
          player_id?: mongoose.Types.ObjectId
          team_competition_id?: mongoose.Types.ObjectId
          goals?: number
          assists?: number
          preassists?: number
          shots_on_goal?: number
          avg?: number
          matches_played?: number
        }>
    : []

  const historicalPlayerCompetitionIds = historicalPlayerCompetitions.map((row) => row._id)
  const historicalPlayerMatchStats = historicalPlayerCompetitionIds.length
    ? await TeamCompetitionModel.db.collection("playermatchstats")
        .find(
          { player_competition_id: { $in: historicalPlayerCompetitionIds } },
          {
            projection: {
              player_competition_id: 1,
              goals: 1,
              assists: 1,
              preassists: 1,
              shots_on_goal: 1,
              won: 1,
              draw: 1,
              lost: 1,
            },
          }
        )
        .toArray() as Array<{
          player_competition_id?: mongoose.Types.ObjectId
          goals?: number
          assists?: number
          preassists?: number
          shots_on_goal?: number
          won?: number
          draw?: number
          lost?: number
        }>
    : []

  const players = await TeamCompetitionModel.db.collection("players")
    .find(
      { _id: { $in: playerObjectIds } },
      { projection: { _id: 1, player_id: 1, player_name: 1, country: 1, avatar: 1 } }
    )
    .toArray() as Array<{
      _id: mongoose.Types.ObjectId
      player_id?: number
      player_name?: string
      country?: string
      avatar?: string
    }>

  const playerByObjectId = new Map(players.map((player) => [player._id.toString(), player]))

  const historicalPlayerCompetitionById = new Map(
    historicalPlayerCompetitions.map((row) => [row._id.toString(), row])
  )
  const playerHistoryMap = new Map<
    string,
    {
      matches: number
      wins: number
      scoringMatches: number
      assistMatches: number
      preassistMatches: number
      goalOrAssistMatches: number
      goals: number
      assists: number
      preassists: number
      shotsOnGoal: number
      avgs: number[]
    }
  >()

  for (const row of historicalPlayerMatchStats) {
    const playerCompetition = row.player_competition_id
      ? historicalPlayerCompetitionById.get(row.player_competition_id.toString())
      : null
    const playerKey = playerCompetition?.player_id?.toString()
    if (!playerKey) continue

    const bucket = playerHistoryMap.get(playerKey) ?? {
      matches: 0,
      wins: 0,
      scoringMatches: 0,
      assistMatches: 0,
      preassistMatches: 0,
      goalOrAssistMatches: 0,
      goals: 0,
      assists: 0,
      preassists: 0,
      shotsOnGoal: 0,
      avgs: [],
    }

    const goals = Number(row.goals ?? 0)
    const assists = Number(row.assists ?? 0)
    const preassists = Number(row.preassists ?? 0)
    bucket.matches += 1
    bucket.wins += Number(row.won ?? 0) > 0 ? 1 : 0
    bucket.scoringMatches += goals > 0 ? 1 : 0
    bucket.assistMatches += assists > 0 ? 1 : 0
    bucket.preassistMatches += preassists > 0 ? 1 : 0
    bucket.goalOrAssistMatches += goals + assists + preassists > 0 ? 1 : 0
    bucket.goals += goals
    bucket.assists += assists
    bucket.preassists += preassists
    bucket.shotsOnGoal += Number(row.shots_on_goal ?? 0)
    if (typeof playerCompetition?.avg === "number") {
      bucket.avgs.push(playerCompetition.avg)
    }

    playerHistoryMap.set(playerKey, bucket)
  }

  const buildTeamAnalysis = (side: "home" | "away", team: TeamSummary | null, teamCompetitionId?: mongoose.Types.ObjectId): BetBallAnalysisTeam => {
    const topScorers = playerCompetitions
      .filter((row) => row.team_competition_id?.toString() === teamCompetitionId?.toString())
      .map((row) => {
        const player = row.player_id ? playerByObjectId.get(row.player_id.toString()) : null
        const history = row.player_id ? playerHistoryMap.get(row.player_id.toString()) : null
        const currentMatchesPlayed = Math.max(0, getNumericValue(row, "matches_played", "matchesPlayed"))
        const currentGoals = getNumericValue(row, "goals")
        const currentAssists = getNumericValue(row, "assists")
        const currentPreassists = getNumericValue(row, "preassists")
        const matchesPlayed = Math.max(1, history?.matches ?? Math.max(1, currentMatchesPlayed))
        const historicalGoals = history?.goals ?? currentGoals
        const historicalAssists = history?.assists ?? currentAssists
        const historicalPreassists = history?.preassists ?? currentPreassists
        const shotsOnGoal = history?.shotsOnGoal ?? getNumericValue(row, "shots_on_goal", "shotsOnGoal")
        const avg = history?.avgs?.length ? getWeightedAverage(history.avgs) : getNumericValue(row, "avg")
        const scoringRate = (history?.scoringMatches ?? 0) / matchesPlayed
        const assistRate = (history?.assistMatches ?? 0) / matchesPlayed
        const preassistRate = (history?.preassistMatches ?? 0) / matchesPlayed
        const goalOrAssistRate = (history?.goalOrAssistMatches ?? 0) / matchesPlayed
        const goalPerMatch = historicalGoals / matchesPlayed
        const shotsPerMatch = shotsOnGoal / matchesPlayed
        const assistPerMatch = historicalAssists / matchesPlayed
        const preassistPerMatch = historicalPreassists / matchesPlayed
        const baseProbability = clamp(scoringRate * 0.64 + goalPerMatch * 0.22 + shotsPerMatch * 0.08, 0.06, 0.82)
        const assistProbability = clamp(
          assistRate * 0.48 + preassistRate * 0.18 + assistPerMatch * 0.16 + preassistPerMatch * 0.08 + avg / 40,
          0.05,
          0.72
        )

        return {
          playerId: Number(player?.player_id ?? 0),
          playerName: player?.player_name ?? "Unknown player",
          country: player?.country ?? "",
          avatar: player?.avatar ?? "",
          kitImage: team?.kitImage ?? "",
          kitTextColor: team?.kitTextColor ?? "",
          goals: currentGoals,
          assists: currentAssists,
          preassists: currentPreassists,
          matchesPlayed: currentMatchesPlayed,
          shotsOnGoal,
          avg,
          odds: toDecimalOddsFromProbability(baseProbability),
          assistOdds: toDecimalOddsFromProbability(assistProbability),
          goalOrAssistOdds: toDecimalOddsFromProbability(clamp(goalOrAssistRate * 0.72 + baseProbability * 0.22 + assistProbability * 0.16, 0.08, 0.88)),
        }
      })
      .sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals
        if (b.assists !== a.assists) return b.assists - a.assists
        if (b.shotsOnGoal !== a.shotsOnGoal) return b.shotsOnGoal - a.shotsOnGoal
        return b.avg - a.avg
      })

    return {
      side,
      name: team?.name ?? "Unknown team",
      image: team?.image ?? "",
      stats: team?.stats ?? {
        pointsPerMatch: 0,
        goalsPerMatch: 0,
        concededPerMatch: 0,
        cleanSheetRate: 0,
        winRate: 0,
      },
      scorerMarkets: topScorers.map((player) => ({
        id: `scorer-${side}-${player.playerId}`,
        token: "AG",
        label: `${player.playerName} to score`,
        description: `Anytime goalscorer for ${team?.name ?? "team"}`,
        odds: player.odds,
        category: "scorer",
      })),
      topScorers,
    }
  }

  const buildTeamSummary = (
    teamData: typeof team1 | null,
    teamId?: number | mongoose.Types.ObjectId,
    teamCompetitionId?: mongoose.Types.ObjectId
  ): TeamSummary | null => {
    if (!teamData) return null

    const teamHistory = teamId !== undefined && teamId !== null ? teamHistoryMap.get(String(teamId)) : null
    const historicalMatches = Math.max(1, teamHistory?.matchesPlayed ?? 0)
    const currentRosterRows = playerCompetitions.filter((row) => row.team_competition_id?.toString() === teamCompetitionId?.toString())
    const playerWinRates = currentRosterRows
      .map((row) => (row.player_id ? playerHistoryMap.get(row.player_id.toString()) : null))
      .filter((history): history is NonNullable<typeof history> => Boolean(history))
      .map((history) => history.matches > 0 ? history.wins / history.matches : 0)

    const stats = teamHistory
      ? {
          pointsPerMatch: teamHistory.points / historicalMatches,
          goalsPerMatch: teamHistory.goalsScored / historicalMatches,
          concededPerMatch: teamHistory.goalsConceded / historicalMatches,
          cleanSheetRate: teamHistory.cleanSheets / historicalMatches,
          winRate: teamHistory.wins / historicalMatches,
        }
      : teamData.stats

    const strength = getCompetitionStrength({
      points: teamHistory?.points ?? Math.round(teamData.stats.pointsPerMatch * historicalMatches),
      matches_played: historicalMatches,
      goals_scored: teamHistory?.goalsScored ?? Math.round(teamData.stats.goalsPerMatch * historicalMatches),
      goals_conceded: teamHistory?.goalsConceded ?? Math.round(teamData.stats.concededPerMatch * historicalMatches),
      possession_avg: teamHistory?.possessions.length ? getWeightedAverage(teamHistory.possessions) : 50,
      shots_on_goal: (teamHistory?.shotsPerMatch.length ? getWeightedAverage(teamHistory.shotsPerMatch) : 0) * historicalMatches,
    })

    return {
      name: teamData.teamName,
      image: teamData.teamImage,
      kitImage: teamData.teamKit,
      kitTextColor: teamData.teamKitTextColor,
      strength,
      playerWinRate: playerWinRates.length ? getWeightedAverage(playerWinRates) : 0.5,
      stats,
    }
  }

  const homeTeamCompetition = teamCompetitions.find((row) => row._id.toString() === match.team1_competition_id?.toString())
  const awayTeamCompetition = teamCompetitions.find((row) => row._id.toString() === match.team2_competition_id?.toString())

  const homeTeam: TeamSummary | null = buildTeamSummary(team1, homeTeamCompetition?.team_id, match.team1_competition_id)
  const awayTeam: TeamSummary | null = buildTeamSummary(team2, awayTeamCompetition?.team_id, match.team2_competition_id)

  const relevantTeamIds = [homeTeamCompetition?.team_id, awayTeamCompetition?.team_id]
    .filter((value): value is number | mongoose.Types.ObjectId => value !== null && value !== undefined)
    .map((value) => String(value))
  const relevantHistoricalTeamCompetitionIds = historicalTeamCompetitions
    .filter((row) => row.team_id !== undefined && row.team_id !== null && relevantTeamIds.includes(String(row.team_id)))
    .map((row) => row._id)
  const historicalMatchesForMercy = relevantHistoricalTeamCompetitionIds.length
    ? await MatchModel.collection
        .find(
          {
            $or: [
              { team1_competition_id: { $in: relevantHistoricalTeamCompetitionIds } },
              { team2_competition_id: { $in: relevantHistoricalTeamCompetitionIds } },
            ],
          },
          {
            projection: {
              team1_competition_id: 1,
              team2_competition_id: 1,
              score_team1: 1,
              score_team2: 1,
            },
          }
        )
        .toArray() as Array<{
          team1_competition_id?: mongoose.Types.ObjectId
          team2_competition_id?: mongoose.Types.ObjectId
          score_team1?: number
          score_team2?: number
        }>
    : []

  const historicalTeamCompetitionById = new Map(
    historicalTeamCompetitions.map((row) => [row._id.toString(), row])
  )
  let homeMercies = 0
  let awayMercies = 0
  let homeHistoricalMatches = 0
  let awayHistoricalMatches = 0

  for (const historicalMatch of historicalMatchesForMercy) {
    const homeRow = historicalMatch.team1_competition_id
      ? historicalTeamCompetitionById.get(historicalMatch.team1_competition_id.toString())
      : null
    const awayRow = historicalMatch.team2_competition_id
      ? historicalTeamCompetitionById.get(historicalMatch.team2_competition_id.toString())
      : null
    const score1 = Number(historicalMatch.score_team1 ?? 0)
    const score2 = Number(historicalMatch.score_team2 ?? 0)
    const diff = score1 - score2

    if (homeRow?.team_id !== undefined && String(homeRow.team_id) === String(homeTeamCompetition?.team_id)) {
      homeHistoricalMatches += 1
      if (diff >= 7) homeMercies += 1
    }
    if (awayRow?.team_id !== undefined && String(awayRow.team_id) === String(homeTeamCompetition?.team_id)) {
      homeHistoricalMatches += 1
      if (diff <= -7) homeMercies += 1
    }
    if (homeRow?.team_id !== undefined && String(homeRow.team_id) === String(awayTeamCompetition?.team_id)) {
      awayHistoricalMatches += 1
      if (diff >= 7) awayMercies += 1
    }
    if (awayRow?.team_id !== undefined && String(awayRow.team_id) === String(awayTeamCompetition?.team_id)) {
      awayHistoricalMatches += 1
      if (diff <= -7) awayMercies += 1
    }
  }

  const homeMercyRate = homeHistoricalMatches > 0 ? homeMercies / homeHistoricalMatches : 0.03
  const awayMercyRate = awayHistoricalMatches > 0 ? awayMercies / awayHistoricalMatches : 0.03

  const homeAnalysis = buildTeamAnalysis("home", homeTeam, match.team1_competition_id)
  const awayAnalysis = buildTeamAnalysis("away", awayTeam, match.team2_competition_id)
  const resultOdds = buildOdds(
    homeTeam?.strength ?? 0,
    awayTeam?.strength ?? 0,
    homeTeam?.stats.winRate ?? 0.5,
    awayTeam?.stats.winRate ?? 0.5,
    homeTeam?.playerWinRate ?? 0.5,
    awayTeam?.playerWinRate ?? 0.5
  )
  const scorerMarkets = buildCombinedScorerMarkets(homeAnalysis, awayAnalysis)
  const projectedGoals = getProjectedGoals(homeTeam, awayTeam)
  const exactScoreFrequencyMap = new Map<string, number>()
  let exactScoreSampleSize = 0

  for (const historicalMatch of historicalMatches) {
    const homeScore = Number(historicalMatch.score_team1)
    const awayScore = Number(historicalMatch.score_team2)
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue
    if (homeScore === 0 && awayScore === 0) continue

    exactScoreSampleSize += 1
    const scoreKey = `${homeScore}-${awayScore}`
    exactScoreFrequencyMap.set(scoreKey, (exactScoreFrequencyMap.get(scoreKey) ?? 0) + 1)
  }

  const exactScoreHistory = {
    sampleSize: exactScoreSampleSize,
    frequencies: Object.fromEntries(
      [...exactScoreFrequencyMap.entries()].map(([score, count]) => [
        score,
        exactScoreSampleSize > 0 ? count / exactScoreSampleSize : 0,
      ])
    ),
  }

  const matchday = extractMatchdayFromComments(match.comments)
  const week = matchday && matchday > 0 ? Math.ceil(matchday / 2) : 1

  return {
    id: match._id.toString(),
    matchId: match.match_id,
    competitionLabel: competition?.name?.trim() || `Season ${competition?.season ?? "-"}${competition?.division ? ` · Division ${competition.division}` : ""}`,
    week,
    matchday,
    matchdayLabel: matchday ? `MD${matchday}` : "No matchday",
    date: toSafeIsoDate(match.date),
    comments: match.comments ?? "",
    team1Name: team1?.teamName ?? "TBD",
    team1Image: team1?.teamImage ?? "",
    team2Name: team2?.teamName ?? "TBD",
    team2Image: team2?.teamImage ?? "",
    scoreTeam1: Number(match.score_team1 ?? 0),
    scoreTeam2: Number(match.score_team2 ?? 0),
    odds: resultOdds,
    analysis: {
      projectedGoals,
      exactScoreHistory,
      markets: {
        result: [
          {
            id: "result-home",
            token: "1",
            label: `${team1?.teamName ?? "Home"} win`,
            description: "Home team to win the match",
            odds: resultOdds.home,
            category: "result",
          },
          {
            id: "result-draw",
            token: "X",
            label: "Draw",
            description: "Match to finish level",
            odds: resultOdds.draw,
            category: "result",
          },
          {
            id: "result-away",
            token: "2",
            label: `${team2?.teamName ?? "Away"} win`,
            description: "Away team to win the match",
            odds: resultOdds.away,
            category: "result",
          },
        ],
        mercy: buildMercyMarkets(homeTeam, awayTeam, homeMercyRate, awayMercyRate),
        goals: buildTotalGoalsMarkets(homeTeam, awayTeam),
        exactTotalGoals: buildExactTotalGoalsMarkets(homeTeam, awayTeam),
        bothTeamsToScore: buildBothTeamsToScoreMarkets(homeTeam, awayTeam),
        cleanSheet: buildCleanSheetMarkets(homeTeam, awayTeam),
        firstScorer: scorerMarkets.firstScorer,
        topScorer: scorerMarkets.topScorer,
        anytimeScorer: scorerMarkets.anytimeScorer,
        anytimeAssist: scorerMarkets.anytimeAssist,
        goalOrAssist: scorerMarkets.goalOrAssist,
        playerGoalLines: scorerMarkets.playerGoalLines,
      },
      teams: [homeAnalysis, awayAnalysis],
    },
  }
}
