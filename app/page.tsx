import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Play } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import connectDB from "@/lib/db/mongoose"
import TeamModel from "@/lib/models/Team"
import PlayerModel from "@/lib/models/Player"
import MatchModel from "@/lib/models/Match"
import CompetitionModel from "@/lib/models/Competition"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import HistoricMatches from "@/components/historic-matches"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatMinutesSeconds } from "@/lib/utils"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"

export const revalidate = 60

type ScoringFeatRow = {
  _id?: unknown
  braces?: number
  hatTricks?: number
  pokers?: number
}

type TeamGoalsRow = {
  _id?: unknown
  teamGoals?: number
}

type PlayerTotalsRow = {
  playerId?: unknown
  playerName?: string
  country?: string
  teamName?: string
  teamAltName?: string
  matchesPlayed?: number
  matchesWon?: number
  matchesDraw?: number
  matchesLost?: number
  starter?: number
  substitute?: number
  minutesPlayed?: number
  goals?: number
  assists?: number
  preassists?: number
  kicks?: number
  passes?: number
  passesForward?: number
  passesLateral?: number
  passesBackward?: number
  keypass?: number
  autopass?: number
  misspass?: number
  shotsOnGoal?: number
  shotsOffGoal?: number
  shotsDefended?: number
  saves?: number
  recoveries?: number
  clearances?: number
  goalsConceded?: number
  cs?: number
  owngoals?: number
  avgSum?: number
  avgCount?: number
  TOTW?: number
  MVP?: number
  hasGK?: boolean
}

type TeamTotalsRow = {
  teamId?: unknown
  teamName?: string
  teamAltName?: string
  country?: string
  matchesPlayed?: number
  matchesWon?: number
  matchesDraw?: number
  matchesLost?: number
  goalsScored?: number
  goalsConceded?: number
  points?: number
  possessionAvg?: number
  kicks?: number
  passes?: number
  shotsOnGoal?: number
  shotsOffGoal?: number
  saves?: number
  cs?: number
}

type PlayerRow = {
  id: string
  name: string
  country: string
  team: string
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  starter: number
  substitute: number
  minutesPlayed: number
  goals: number
  assists: number
  preassists: number
  kicks: number
  passes: number
  passesForward: number
  passesLateral: number
  passesBackward: number
  keypass: number
  autopass: number
  misspass: number
  shotsOnGoal: number
  shotsOffGoal: number
  shotsDefended: number
  saves: number
  recoveries: number
  clearances: number
  goalsConceded: number
  cs: number
  owngoals: number
  teamGoals: number
  braces: number
  hatTricks: number
  pokers: number
  avg: number
  TOTW: number
  MVP: number
  hasGK: boolean
}

type TeamRow = {
  id: string
  name: string
  country: string
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  goalsScored: number
  goalsConceded: number
  points: number
  possessionAvg: number
  kicks: number
  passes: number
  shotsOnGoal: number
  shotsOffGoal: number
  saves: number
  cs: number
}

type RankingRow = {
  id: string
  name: string
  country: string
  team?: string
  value: number
  goals?: number
  assists?: number
  preassists?: number
  matchesWon?: number
  matchesDraw?: number
  matchesLost?: number
}

type PlayerMetric = {
  key: string
  label: string
  format: "number" | "percent" | "decimal" | "time"
  value: (player: PlayerRow) => number
  gkOnly?: boolean
}

type TeamMetric = {
  key: string
  label: string
  format: "number" | "percent"
  value: (team: TeamRow) => number
}

type MetricGroup<TMetric> = {
  key: string
  label: string
  metrics: TMetric[]
}

type HistoricMatchDoc = {
  _id?: unknown
  date?: Date | string
  score_team1?: number
  scoreTeam1?: number
  score_team2?: number
  scoreTeam2?: number
  team1_competition_id?: { team_id?: { teamName?: string; team_name?: string; image?: string } }
  team2_competition_id?: { team_id?: { teamName?: string; team_name?: string; image?: string } }
}

type RecentMatchDoc = {
  _id?: unknown
  date?: Date | string
  score_team1?: number
  scoreTeam1?: number
  score_team2?: number
  scoreTeam2?: number
  team1_competition_id?: { team_id?: { teamName?: string; team_name?: string; image?: string } }
  team2_competition_id?: { team_id?: { teamName?: string; team_name?: string; image?: string } }
}

type CompetitionSummary = {
  _id?: unknown
  competition_id?: number | string
  season_id?: number | string
  season?: number | string
}

function getTwemojiUrl(emoji: string) {
  if (!emoji) return ""
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16))
    .join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

export default async function HomePage() {
  await connectDB()
  const [teamCount, playerCount, matchCount, competitionCount] = await Promise.all([
    TeamModel.countDocuments(),
    PlayerModel.countDocuments(),
    MatchModel.countDocuments(),
    CompetitionModel.countDocuments(),
  ])
  const historicMatches = await MatchModel.find({
    comments: { $regex: "Historic", $options: "i" },
  })
    .sort({ date: -1 })
    .limit(5)
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id" },
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id" },
    })
    .lean()

  const scoringFeats = await PlayerMatchStatsModel.aggregate([
    {
      $group: {
        _id: { pc: "$player_competition_id", match: "$match_id" },
        goals: { $max: "$goals" },
      },
    },
    {
      $project: {
        pc: "$_id.pc",
        goals: 1,
      },
    },
    {
      $group: {
        _id: "$pc",
        braces: { $sum: { $cond: [{ $eq: ["$goals", 2] }, 1, 0] } },
        hatTricks: { $sum: { $cond: [{ $eq: ["$goals", 3] }, 1, 0] } },
        pokers: { $sum: { $cond: [{ $gte: ["$goals", 4] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: "playercompetitions",
        localField: "_id",
        foreignField: "_id",
        as: "pc",
      },
    },
    { $unwind: { path: "$pc", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: "$pc.player_id",
        braces: { $sum: "$braces" },
        hatTricks: { $sum: "$hatTricks" },
        pokers: { $sum: "$pokers" },
      },
    },
  ])
  const teamGoalsByPlayerRaw = await PlayerMatchStatsModel.aggregate([
    {
      $lookup: {
        from: "playercompetitions",
        localField: "player_competition_id",
        foreignField: "_id",
        as: "playerCompetition",
      },
    },
    { $unwind: { path: "$playerCompetition", preserveNullAndEmptyArrays: false } },
    {
      $project: {
        playerId: "$playerCompetition.player_id",
        matchId: "$match_id",
        teamCompetitionId: "$team_competition_id",
      },
    },
    {
      $group: {
        _id: {
          playerId: "$playerId",
          matchId: "$matchId",
          teamCompetitionId: "$teamCompetitionId",
        },
      },
    },
    {
      $lookup: {
        from: "goals",
        let: { matchId: "$_id.matchId", teamCompetitionId: "$_id.teamCompetitionId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$match_id", "$$matchId"] },
                  { $eq: ["$team_competition_id", "$$teamCompetitionId"] },
                ],
              },
            },
          },
          { $count: "goals" },
        ],
        as: "matchGoals",
      },
    },
    {
      $addFields: {
        goals: { $ifNull: [{ $arrayElemAt: ["$matchGoals.goals", 0] }, 0] },
      },
    },
    {
      $group: {
        _id: "$_id.playerId",
        teamGoals: { $sum: "$goals" },
      },
    },
  ])
  const teamTotalsRaw = await TeamCompetitionModel.aggregate([
    {
      $group: {
        _id: "$team_id",
        matchesPlayed: { $sum: "$matches_played" },
        matchesWon: { $sum: "$matches_won" },
        matchesDraw: { $sum: "$matches_draw" },
        matchesLost: { $sum: "$matches_lost" },
        goalsScored: { $sum: "$goals_scored" },
        goalsConceded: { $sum: "$goals_conceded" },
        points: { $sum: "$points" },
        possessionAvg: { $avg: "$possession_avg" },
        kicks: { $sum: "$kicks" },
        passes: { $sum: "$passes" },
        shotsOnGoal: { $sum: "$shots_on_goal" },
        shotsOffGoal: { $sum: "$shots_off_goal" },
        saves: { $sum: "$saves" },
        cs: { $sum: "$cs" },
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "_id",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        teamId: "$_id",
        teamName: "$team.teamName",
        teamAltName: "$team.team_name",
        country: "$team.country",
        matchesPlayed: 1,
        matchesWon: 1,
        matchesDraw: 1,
        matchesLost: 1,
        goalsScored: 1,
        goalsConceded: 1,
        points: 1,
        possessionAvg: 1,
        kicks: 1,
        passes: 1,
        shotsOnGoal: 1,
        shotsOffGoal: 1,
        saves: 1,
        cs: 1,
      },
    },
  ])
  const playerTotalsRaw = await PlayerCompetitionModel.aggregate([
    {
      $lookup: {
        from: "teamcompetitions",
        localField: "team_competition_id",
        foreignField: "_id",
        as: "teamCompetition",
      },
    },
    { $unwind: { path: "$teamCompetition", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "competitions",
        localField: "teamCompetition.competition_id",
        foreignField: "_id",
        as: "competition",
      },
    },
    { $unwind: { path: "$competition", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        competitionStart: { $ifNull: ["$competition.start_date", new Date(0)] },
      },
    },
    {
      $group: {
        _id: {
          playerId: "$player_id",
          teamCompetitionId: "$team_competition_id",
          competitionStart: "$competitionStart",
        },
        matchesPlayedTeam: { $sum: "$matches_played" },
        matchesWon: { $sum: "$matches_won" },
        matchesDraw: { $sum: "$matches_draw" },
        matchesLost: { $sum: "$matches_lost" },
        starter: { $sum: "$starter" },
        substitute: { $sum: "$substitute" },
        minutesPlayed: { $sum: "$minutes_played" },
        goals: { $sum: "$goals" },
        assists: { $sum: "$assists" },
        preassists: { $sum: "$preassists" },
        kicks: { $sum: "$kicks" },
        passes: { $sum: "$passes" },
        passesForward: { $sum: "$passes_forward" },
        passesLateral: { $sum: "$passes_lateral" },
        passesBackward: { $sum: "$passes_backward" },
        keypass: { $sum: "$keypass" },
        autopass: { $sum: "$autopass" },
        misspass: { $sum: "$misspass" },
        shotsOnGoal: { $sum: "$shots_on_goal" },
        shotsOffGoal: { $sum: "$shots_off_goal" },
        shotsDefended: { $sum: "$shotsDefended" },
        saves: { $sum: "$saves" },
        recoveries: { $sum: "$recoveries" },
        clearances: { $sum: "$clearances" },
        goalsConceded: { $sum: "$goals_conceded" },
        cs: {
          $sum: {
            $cond: [
              { $eq: [{ $toUpper: { $ifNull: ["$position", ""] } }, "GK"] },
              { $ifNull: ["$cs", 0] },
              0,
            ],
          },
        },
        owngoals: { $sum: "$owngoals" },
        avgSum: { $sum: "$avg" },
        avgCount: { $sum: 1 },
        TOTW: { $sum: "$TOTW" },
        MVP: { $sum: "$MVP" },
        hasGK: { $max: { $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$position", ""] } }, "GK"] }, 1, 0] } },
      },
    },
    { $sort: { "_id.competitionStart": -1, matchesPlayedTeam: -1 } },
    {
      $group: {
        _id: "$_id.playerId",
        teamCompetitionId: { $first: "$_id.teamCompetitionId" },
        matchesPlayed: { $sum: "$matchesPlayedTeam" },
        matchesWon: { $sum: "$matchesWon" },
        matchesDraw: { $sum: "$matchesDraw" },
        matchesLost: { $sum: "$matchesLost" },
        starter: { $sum: "$starter" },
        substitute: { $sum: "$substitute" },
        minutesPlayed: { $sum: "$minutesPlayed" },
        goals: { $sum: "$goals" },
        assists: { $sum: "$assists" },
        preassists: { $sum: "$preassists" },
        kicks: { $sum: "$kicks" },
        passes: { $sum: "$passes" },
        passesForward: { $sum: "$passesForward" },
        passesLateral: { $sum: "$passesLateral" },
        passesBackward: { $sum: "$passesBackward" },
        keypass: { $sum: "$keypass" },
        autopass: { $sum: "$autopass" },
        misspass: { $sum: "$misspass" },
        shotsOnGoal: { $sum: "$shotsOnGoal" },
        shotsOffGoal: { $sum: "$shotsOffGoal" },
        shotsDefended: { $sum: "$shotsDefended" },
        saves: { $sum: "$saves" },
        recoveries: { $sum: "$recoveries" },
        clearances: { $sum: "$clearances" },
        goalsConceded: { $sum: "$goalsConceded" },
        cs: { $sum: "$cs" },
        owngoals: { $sum: "$owngoals" },
        avgSum: { $sum: "$avgSum" },
        avgCount: { $sum: "$avgCount" },
        TOTW: { $sum: "$TOTW" },
        MVP: { $sum: "$MVP" },
        hasGK: { $max: "$hasGK" },
      },
    },
    {
      $lookup: {
        from: "players",
        localField: "_id",
        foreignField: "_id",
        as: "player",
      },
    },
    { $unwind: { path: "$player", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "teamcompetitions",
        localField: "teamCompetitionId",
        foreignField: "_id",
        as: "teamCompetition",
      },
    },
    { $unwind: { path: "$teamCompetition", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "teams",
        localField: "teamCompetition.team_id",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        playerId: "$_id",
        playerName: "$player.player_name",
        country: "$player.country",
        teamName: "$team.teamName",
        teamAltName: "$team.team_name",
        matchesPlayed: 1,
        matchesWon: 1,
        matchesDraw: 1,
        matchesLost: 1,
        starter: 1,
        substitute: 1,
        minutesPlayed: 1,
        goals: 1,
        assists: 1,
        preassists: 1,
        kicks: 1,
        passes: 1,
        passesForward: 1,
        passesLateral: 1,
        passesBackward: 1,
        keypass: 1,
        autopass: 1,
        misspass: 1,
        shotsOnGoal: 1,
        shotsOffGoal: 1,
        shotsDefended: 1,
        saves: 1,
        recoveries: 1,
        clearances: 1,
        goalsConceded: 1,
        cs: 1,
        owngoals: 1,
        avgSum: 1,
        avgCount: 1,
        TOTW: 1,
        MVP: 1,
        hasGK: 1,
      },
    },
  ])

  const scoringFeatsByPlayer = new Map<string, { braces: number; hatTricks: number; pokers: number }>()
  ;(scoringFeats as ScoringFeatRow[]).forEach((row) => {
    if (!row?._id) return
    scoringFeatsByPlayer.set(String(row._id), {
      braces: Number(row.braces ?? 0),
      hatTricks: Number(row.hatTricks ?? 0),
      pokers: Number(row.pokers ?? 0),
    })
  })
  const teamGoalsByPlayer = new Map<string, number>()
  ;(teamGoalsByPlayerRaw as TeamGoalsRow[]).forEach((row) => {
    if (!row?._id) return
    teamGoalsByPlayer.set(String(row._id), Number(row.teamGoals ?? 0))
  })

  const safeDivide = (numerator: number, denominator: number) =>
    denominator > 0 ? numerator / denominator : 0

  const players: PlayerRow[] = (playerTotalsRaw as PlayerTotalsRow[]).map((row) => ({
    id: row.playerId?.toString() || "",
    name: row.playerName || "Player",
    country: row.country || "",
    team: row.teamName || row.teamAltName || "Team",
    matchesPlayed: Number(row.matchesPlayed ?? 0),
    matchesWon: Number(row.matchesWon ?? 0),
    matchesDraw: Number(row.matchesDraw ?? 0),
    matchesLost: Number(row.matchesLost ?? 0),
    starter: Number(row.starter ?? 0),
    substitute: Number(row.substitute ?? 0),
    minutesPlayed: Number(row.minutesPlayed ?? 0),
    goals: Number(row.goals ?? 0),
    assists: Number(row.assists ?? 0),
    preassists: Number(row.preassists ?? 0),
    kicks: Number(row.kicks ?? 0),
    passes: Number(row.passes ?? 0),
    passesForward: Number(row.passesForward ?? 0),
    passesLateral: Number(row.passesLateral ?? 0),
    passesBackward: Number(row.passesBackward ?? 0),
    keypass: Number(row.keypass ?? 0),
    autopass: Number(row.autopass ?? 0),
    misspass: Number(row.misspass ?? 0),
    shotsOnGoal: Number(row.shotsOnGoal ?? 0),
    shotsOffGoal: Number(row.shotsOffGoal ?? 0),
    shotsDefended: Number(row.shotsDefended ?? 0),
    saves: Number(row.saves ?? 0),
    recoveries: Number(row.recoveries ?? 0),
    clearances: Number(row.clearances ?? 0),
    goalsConceded: Number(row.goalsConceded ?? 0),
    cs: Number(row.cs ?? 0),
    owngoals: Number(row.owngoals ?? 0),
    teamGoals: teamGoalsByPlayer.get(String(row.playerId)) ?? 0,
    braces: scoringFeatsByPlayer.get(String(row.playerId))?.braces ?? 0,
    hatTricks: scoringFeatsByPlayer.get(String(row.playerId))?.hatTricks ?? 0,
    pokers: scoringFeatsByPlayer.get(String(row.playerId))?.pokers ?? 0,
    avg: safeDivide(Number(row.avgSum ?? 0), Number(row.avgCount ?? 1)),
    TOTW: Number(row.TOTW ?? 0),
    MVP: Number(row.MVP ?? 0),
    hasGK: Boolean(row.hasGK),
  }))
  const teams: TeamRow[] = (teamTotalsRaw as TeamTotalsRow[]).map((row) => ({
    id: row.teamId?.toString() || "",
    name: row.teamName || row.teamAltName || "Team",
    country: row.country || "",
    matchesPlayed: Number(row.matchesPlayed ?? 0),
    matchesWon: Number(row.matchesWon ?? 0),
    matchesDraw: Number(row.matchesDraw ?? 0),
    matchesLost: Number(row.matchesLost ?? 0),
    goalsScored: Number(row.goalsScored ?? 0),
    goalsConceded: Number(row.goalsConceded ?? 0),
    points: Number(row.points ?? 0),
    possessionAvg: Number(row.possessionAvg ?? 0),
    kicks: Number(row.kicks ?? 0),
    passes: Number(row.passes ?? 0),
    shotsOnGoal: Number(row.shotsOnGoal ?? 0),
    shotsOffGoal: Number(row.shotsOffGoal ?? 0),
    saves: Number(row.saves ?? 0),
    cs: Number(row.cs ?? 0),
  }))

  const metricGroups: MetricGroup<PlayerMetric>[] = [
    {
      key: "impact",
      label: "Impact",
      metrics: [
        { key: "games", label: "Games", format: "number", value: (p) => p.matchesPlayed },
        { key: "won", label: "Won", format: "number", value: (p) => p.matchesWon },
        { key: "draw", label: "Draw", format: "number", value: (p) => p.matchesDraw },
        { key: "lost", label: "Lost", format: "number", value: (p) => p.matchesLost },
        {
          key: "win_rate",
          label: "Win rate",
          format: "percent",
          value: (p) => safeDivide(p.matchesWon, p.matchesPlayed),
        },
        { key: "avg", label: "Avg", format: "decimal", value: (p) => p.avg },
        {
          key: "gap",
          label: "G/A/P",
          format: "number",
          value: (p) => p.goals + p.assists + p.preassists,
        },
        {
          key: "gi",
          label: "Team GI",
          format: "percent",
          value: (p) =>
            safeDivide(p.goals + p.assists + p.preassists, p.teamGoals),
        },
        { key: "totw", label: "TOTW", format: "number", value: (p) => p.TOTW },
        { key: "mvp", label: "MVP", format: "number", value: (p) => p.MVP },
      ],
    },
    {
      key: "finishing",
      label: "Finishing",
      metrics: [
        { key: "goals", label: "Goals", format: "number", value: (p) => p.goals },
        { key: "braces", label: "Braces", format: "number", value: (p) => p.braces },
        {
          key: "hat_tricks",
          label: "Hat tricks",
          format: "number",
          value: (p) => p.hatTricks,
        },
        { key: "pokers", label: "Pokers", format: "number", value: (p) => p.pokers },
        {
          key: "shots_on",
          label: "Shots on Goal",
          format: "number",
          value: (p) => p.shotsOnGoal,
        },
        {
          key: "shots_off",
          label: "Shots off Goal",
          format: "number",
          value: (p) => p.shotsOffGoal,
        },
        {
          key: "shots_per_min",
          label: "Shots per min",
          format: "decimal",
          value: (p) =>
            safeDivide((p.shotsOnGoal + p.shotsOffGoal) * 60, p.minutesPlayed),
        },
        {
          key: "on_target_pct",
          label: "% on target",
          format: "percent",
          value: (p) =>
            p.shotsOnGoal + p.shotsOffGoal >= 7
              ? safeDivide(p.shotsOnGoal, p.shotsOnGoal + p.shotsOffGoal)
              : 0,
        },
        {
          key: "goal_accuracy",
          label: "Goal accuracy",
          format: "percent",
          value: (p) =>
            safeDivide(p.goals, p.shotsOnGoal + p.shotsOffGoal),
        },
        { key: "owngoals", label: "Owngoals", format: "number", value: (p) => p.owngoals },
      ],
    },
    {
      key: "passing",
      label: "Passing",
      metrics: [
        { key: "assists", label: "Assists", format: "number", value: (p) => p.assists },
        {
          key: "preassists",
          label: "Pre-Assists",
          format: "number",
          value: (p) => p.preassists,
        },
        { key: "passes", label: "Passes", format: "number", value: (p) => p.passes },
        {
          key: "passes_per_min",
          label: "Passes per min",
          format: "decimal",
          value: (p) => safeDivide(p.passes * 60, p.minutesPlayed),
        },
        {
          key: "pass_accuracy",
          label: "Pass accuracy",
          format: "percent",
          value: (p) => safeDivide(p.passes, p.passes + p.misspass),
        },
        { key: "keypasses", label: "Keypasses", format: "number", value: (p) => p.keypass },
        {
          key: "keypass_pct",
          label: "% key passes",
          format: "percent",
          value: (p) => safeDivide(p.keypass, p.passes),
        },
        {
          key: "autopasses",
          label: "Autopasses",
          format: "number",
          value: (p) => p.autopass,
        },
        {
          key: "autopass_pct",
          label: "% autopass",
          format: "percent",
          value: (p) => safeDivide(p.autopass, p.kicks),
        },
      ],
    },
    {
      key: "defense",
      label: "Defense",
      metrics: [
        {
          key: "recoveries",
          label: "Recoveries",
          format: "number",
          value: (p) => p.recoveries,
        },
        {
          key: "recoveries_per_min",
          label: "Recoveries per min",
          format: "decimal",
          value: (p) => safeDivide(p.recoveries * 60, p.minutesPlayed),
        },
        {
          key: "clearances",
          label: "Clearances",
          format: "number",
          value: (p) => p.clearances,
        },
        {
          key: "clearances_per_min",
          label: "Clearances per min",
          format: "decimal",
          value: (p) => safeDivide(p.clearances * 60, p.minutesPlayed),
        },
        { key: "saves", label: "Saves", format: "number", value: (p) => p.saves },
        {
          key: "goals_conceded",
          label: "Goals conceded",
          format: "number",
          value: (p) => p.goalsConceded,
        },
        {
          key: "save_pct",
          label: "% shots saved",
          format: "percent",
          value: (p) => safeDivide(p.saves, p.saves + p.goalsConceded),
        },
        {
          key: "cs",
          label: "Clean sheets",
          format: "number",
          value: (p) => p.cs,
          gkOnly: true,
        },
        {
          key: "cs_pct",
          label: "% games with CS",
          format: "percent",
          value: (p) => safeDivide(p.cs, p.matchesPlayed),
          gkOnly: true,
        },
      ],
    },
    {
      key: "progression",
      label: "Progression",
      metrics: [
        { key: "fwd", label: "Fwd", format: "number", value: (p) => p.passesForward },
        {
          key: "fwd_per_min",
          label: "Fwd per min",
          format: "decimal",
          value: (p) => safeDivide(p.passesForward * 60, p.minutesPlayed),
        },
        { key: "lat", label: "Lat", format: "number", value: (p) => p.passesLateral },
        {
          key: "lat_per_min",
          label: "Lat per min",
          format: "decimal",
          value: (p) => safeDivide(p.passesLateral * 60, p.minutesPlayed),
        },
        {
          key: "back",
          label: "Back",
          format: "number",
          value: (p) => p.passesBackward,
        },
        {
          key: "back_per_min",
          label: "Back per min",
          format: "decimal",
          value: (p) => safeDivide(p.passesBackward * 60, p.minutesPlayed),
        },
        {
          key: "fwd_back_balance",
          label: "Fwd-Back balance",
          format: "number",
          value: (p) => p.passesForward - p.passesBackward,
        },
        {
          key: "pct_forward",
          label: "% forward",
          format: "percent",
          value: (p) => safeDivide(p.passesForward, p.passes),
        },
        {
          key: "pct_lateral",
          label: "% lateral",
          format: "percent",
          value: (p) => safeDivide(p.passesLateral, p.passes),
        },
        {
          key: "pct_backward",
          label: "% backward",
          format: "percent",
          value: (p) => safeDivide(p.passesBackward, p.passes),
        },
      ],
    },
    {
      key: "physical",
      label: "Physical",
      metrics: [
        {
          key: "minutes",
          label: "Minutes",
          format: "time",
          value: (p) => p.minutesPlayed,
        },
        {
          key: "minutes_per_game",
          label: "Minutes per game",
          format: "time",
          value: (p) => safeDivide(p.minutesPlayed, p.matchesPlayed),
        },
        { key: "starter", label: "Starter", format: "number", value: (p) => p.starter },
        {
          key: "substitute",
          label: "Substitute",
          format: "number",
          value: (p) => p.substitute,
        },
        {
          key: "starter_pct",
          label: "% as starter",
          format: "percent",
          value: (p) => safeDivide(p.starter, p.matchesPlayed),
        },
        {
          key: "substitute_pct",
          label: "% as substitute",
          format: "percent",
          value: (p) => safeDivide(p.substitute, p.matchesPlayed),
        },
        { key: "kicks", label: "Kicks", format: "number", value: (p) => p.kicks },
        {
          key: "kicks_per_min",
          label: "Kicks per min",
          format: "decimal",
          value: (p) => safeDivide(p.kicks * 60, p.minutesPlayed),
        },
        {
          key: "misspasses",
          label: "Misspasses",
          format: "number",
          value: (p) => p.misspass,
        },
        {
          key: "misspasses_per_min",
          label: "Misspasses per min",
          format: "decimal",
          value: (p) => safeDivide(p.misspass * 60, p.minutesPlayed),
        },
      ],
    },
  ]
  const teamMetricGroups: MetricGroup<TeamMetric>[] = [
    {
      key: "impact",
      label: "Impact",
      metrics: [
        { key: "games", label: "Games", format: "number", value: (t) => t.matchesPlayed },
        { key: "won", label: "Won", format: "number", value: (t) => t.matchesWon },
        { key: "draw", label: "Draw", format: "number", value: (t) => t.matchesDraw },
        { key: "lost", label: "Lost", format: "number", value: (t) => t.matchesLost },
        {
          key: "win_rate",
          label: "Win rate",
          format: "percent",
          value: (t) => safeDivide(t.matchesWon, t.matchesPlayed),
        },
      ],
    },
    {
      key: "finishing",
      label: "Finishing",
      metrics: [
        {
          key: "goals_scored",
          label: "Goals scored",
          format: "number",
          value: (t) => t.goalsScored,
        },
        {
          key: "shots_on",
          label: "Shots on Goal",
          format: "number",
          value: (t) => t.shotsOnGoal,
        },
        {
          key: "shots_off",
          label: "Shots off Goal",
          format: "number",
          value: (t) => t.shotsOffGoal,
        },
        {
          key: "on_target_pct",
          label: "% on target",
          format: "percent",
          value: (t) =>
            safeDivide(t.shotsOnGoal, t.shotsOnGoal + t.shotsOffGoal),
        },
      ],
    },
    {
      key: "passing",
      label: "Passing",
      metrics: [
        { key: "passes", label: "Passes", format: "number", value: (t) => t.passes },
        { key: "kicks", label: "Kicks", format: "number", value: (t) => t.kicks },
        {
          key: "possession",
          label: "Possession",
          format: "percent",
          value: (t) => safeDivide(t.possessionAvg, 100),
        },
      ],
    },
    {
      key: "defense",
      label: "Defense",
      metrics: [
        {
          key: "goals_conceded",
          label: "Goals conceded",
          format: "number",
          value: (t) => t.goalsConceded,
        },
        { key: "saves", label: "Saves", format: "number", value: (t) => t.saves },
        { key: "cs", label: "Clean sheets", format: "number", value: (t) => t.cs },
      ],
    },
  ]

  const formatValue = (value: number, format: string) => {
    if (!Number.isFinite(value)) return "-"
    if (format === "time") {
      return formatMinutesSeconds(value)
    }
    if (format === "percent") return `${(value * 100).toFixed(1)}%`
    if (format === "decimal") return value.toFixed(2)
    return Math.round(value).toString()
  }

  const buildTopRanking = (metric: PlayerMetric) => {
    const rows = players
      .filter((player) => player.matchesPlayed >= 7)
      .filter((player) => !metric.gkOnly || player.hasGK)
      .map((player) => {
        const base = {
          id: player.id,
          name: player.name,
          country: player.country,
          team: player.team,
          value: metric.value(player),
        }
        if (metric.key === "gap") {
          return {
            ...base,
            goals: player.goals,
            assists: player.assists,
            preassists: player.preassists,
          }
        }
        return base
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 30)

    return rows
  }
  const buildTeamRanking = (metric: TeamMetric) => {
    const rows = teams
      .map((team) => ({
        id: team.id,
        name: team.name,
        country: team.country,
        value: metric.value(team),
        matchesWon: team.matchesWon,
        matchesDraw: team.matchesDraw,
        matchesLost: team.matchesLost,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30)

    return rows
  }

  const rankingsByMetric = metricGroups.reduce<Record<string, RankingRow[]>>((acc, group) => {
    group.metrics.forEach((metric) => {
      acc[metric.key] = buildTopRanking(metric)
    })
    return acc
  }, {})
  const teamRankingsByMetric = teamMetricGroups.reduce<Record<string, RankingRow[]>>((acc, group) => {
    group.metrics.forEach((metric) => {
      acc[metric.key] = buildTeamRanking(metric)
    })
    return acc
  }, {})

  const renderRankingTabs = (
    groups: MetricGroup<PlayerMetric | TeamMetric>[],
    rankings: Record<string, RankingRow[]>,
    showGapDetails: boolean,
    showTeamRecord: boolean
  ) => (
    <Tabs defaultValue={groups[0]?.key} className="w-full">
      <TabsList className="grid grid-cols-3 gap-2 mb-4 bg-slate-950/60 md:grid-cols-6">
        {groups.map((group) => (
          <TabsTrigger
            key={group.key}
            value={group.key}
            className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
          >
            {group.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {groups.map((group) => (
        <TabsContent key={group.key} value={group.key}>
          <Tabs defaultValue={group.metrics[0]?.key} className="w-full">
            <div className="mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-max flex-nowrap gap-2 rounded-lg bg-slate-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {group.metrics.map((metric) => (
                  <TabsTrigger
                    key={metric.key}
                    value={metric.key}
                    className="flex-none whitespace-nowrap data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
                  >
                    {metric.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {group.metrics.map((metric) => (
              <TabsContent key={metric.key} value={metric.key}>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-900/60">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.4em] text-slate-400">
                    <span>{group.label}</span>
                    <span>{metric.label}</span>
                  </div>
                  <div className="h-[372px] overflow-hidden">
                    <div className="h-full space-y-3 overflow-y-auto pr-2">
                      {(rankings[metric.key] || []).map((row, idx) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-3 transition-colors hover:bg-slate-900/90"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-8 w-8 rounded-full bg-teal-500/20 text-teal-200 flex items-center justify-center text-xs font-semibold tracking-wide">
                              {idx + 1}
                              {row.country ? (
                                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900/90 p-0.5">
                                  <Image
                                    src={getTwemojiUrl(row.country)}
                                    alt={row.country}
                                    width={12}
                                    height={12}
                                    className="h-3 w-3"
                                  />
                                </span>
                              ) : null}
                            </div>
                            <div>
                              <p className="text-white font-medium">{row.name}</p>
                              {row.team ? (
                                <p className="text-xs text-slate-400">{row.team}</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-sm text-teal-300 font-semibold">
                            <div>{formatValue(row.value, metric.format)}</div>
                            {showTeamRecord && metric.key === "games" && (
                              <div className="text-[11px] text-slate-400">
                                {row.matchesWon ?? 0}W/{row.matchesDraw ?? 0}D/
                                {row.matchesLost ?? 0}L
                              </div>
                            )}
                            {showGapDetails && metric.key === "gap" && (
                              <div className="text-[11px] text-slate-400">
                                {row.goals ?? 0}G/{row.assists ?? 0}SA/
                                {row.preassists ?? 0}P
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {!rankings[metric.key]?.length && (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center text-slate-400">
                          No data
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      ))}
    </Tabs>
  )

  const latestLeague = (await CompetitionModel.findOne({ type: "league", division: 1 })
    .sort({ competition_id: -1 })
    .select({ _id: 1, competition_id: 1, season_id: 1, season: 1 })
    .lean()) as CompetitionSummary | null
  const latestLeagueHref = latestLeague
    ? `/competitions/${latestLeague.competition_id ?? latestLeague._id}`
    : "/competitions"
  const historicMatchesData = (historicMatches as HistoricMatchDoc[]).map((match) => {
    const team1 = match.team1_competition_id?.team_id
    const team2 = match.team2_competition_id?.team_id
    return {
      id: match._id?.toString() || "",
      team1Name: team1?.teamName || team1?.team_name || "Team A",
      team2Name: team2?.teamName || team2?.team_name || "Team B",
      team1Image: team1?.image || "/placeholder.svg?height=40&width=40",
      team2Image: team2?.image || "/placeholder.svg?height=40&width=40",
      score1: Number(match.score_team1 ?? match.scoreTeam1 ?? 0),
      score2: Number(match.score_team2 ?? match.scoreTeam2 ?? 0),
      date: match.date ? new Date(match.date).toLocaleDateString("es-ES") : "-",
    }
  })
  const latestSeasonValue =
    latestLeague?.season_id ?? latestLeague?.season ?? latestLeague?.competition_id
  const latestSeasonLabel = latestSeasonValue
    ? `Season ${latestSeasonValue}`
    : "Season"

  const recentMatchesRaw = await MatchModel.find()
    .sort({ date: -1, match_id: -1 })
    .limit(5)
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id" },
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id" },
    })
    .lean()
  const now = new Date()
  const recentMatches = (recentMatchesRaw as RecentMatchDoc[]).map((match) => {
    const team1 = match.team1_competition_id?.team_id
    const team2 = match.team2_competition_id?.team_id
    const matchDate = match.date ? new Date(match.date) : null
    const isFuture = matchDate ? matchDate.getTime() > now.getTime() : false
    return {
      id: match._id?.toString() || "",
      team1: {
        name: team1?.teamName || team1?.team_name || "Team A",
        logo: team1?.image || "/placeholder.svg?height=40&width=40",
        score: match.score_team1 ?? match.scoreTeam1 ?? null,
      },
      team2: {
        name: team2?.teamName || team2?.team_name || "Team B",
        logo: team2?.image || "/placeholder.svg?height=40&width=40",
        score: match.score_team2 ?? match.scoreTeam2 ?? null,
      },
      date: matchDate ? matchDate.toLocaleDateString("es-ES") : "-",
      status: isFuture ? "Proximo" : "Finalizado",
      href: match._id ? `/matches/${match._id}` : "/matches",
    }
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_55%)]" />
        <div className="absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-[-10%] h-96 w-96 rounded-full bg-slate-700/40 blur-3xl" />

        <div className="relative container mx-auto px-4 pt-24 pb-16">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                {latestSeasonLabel}
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
                Futsal Fusion League
              </h1>
              <p className="mt-4 text-lg text-slate-300 md:text-xl">
                The most competitive Haxball 7v7 esports league - FFL. Join the community and show your skill.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href={latestLeagueHref}>
                  <Button className="bg-teal-500 text-slate-950 hover:bg-teal-400" size="lg">
                    <Play className="mr-2 h-5 w-5" />
                    View current season
                  </Button>
                </Link>
                <a
                  href="https://discord.gg/CjpZZXgh"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Unete a la liga
                  </Button>
                </a>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Teams", value: teamCount },
                  { label: "Players", value: playerCount },
                  { label: "Matches played", value: matchCount },
                  { label: "Tournaments", value: competitionCount },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {item.value ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-gradient-to-br from-teal-500/30 via-slate-900/40 to-slate-800/60 p-[1px]">
              <div className="rounded-[27px] border border-white/10 bg-slate-950/70 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Featured match
                    </p>
                  <h2 className="mt-2 text-2xl font-semibold">Memorable matches</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <HistoricMatches matches={historicMatchesData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white flex items-center">
                  <Calendar className="mr-2 h-6 w-6 text-teal-300" />
                  Latest matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={match.href}
                    className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition-colors hover:bg-slate-900/70"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Image
                            src={match.team1.logo || "/placeholder.svg"}
                            alt={match.team1.name}
                            width={32}
                            height={32}
                            className="rounded"
                          />
                          <span className="text-white font-medium">{match.team1.name}</span>
                        </div>
                        <div className="w-16 text-center">
                          {match.team1.score !== null ? (
                            <span className="text-xl font-semibold text-teal-300">
                              {match.team1.score} - {match.team2.score}
                            </span>
                          ) : (
                            <span className="text-slate-400">vs</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Image
                            src={match.team2.logo || "/placeholder.svg"}
                            alt={match.team2.name}
                            width={32}
                            height={32}
                            className="rounded"
                          />
                          <span className="text-white font-medium">{match.team2.name}</span>
                        </div>
                      </div>
                      <Badge
                        variant={match.status === "Finalizado" ? "default" : "secondary"}
                        className={
                          match.status === "Finalizado"
                            ? "border border-teal-500/40 bg-teal-500/10 text-teal-200"
                            : "border border-white/10 bg-white/5 text-slate-200"
                        }
                      >
                        {match.status}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-sm mt-2">{match.date}</p>
                  </Link>
                ))}
                <Link href="/seasons">
                  <Button className="w-full bg-teal-500 text-slate-950 hover:bg-teal-400">
                    View all matches
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white flex items-center">
                  <Trophy className="mr-2 h-6 w-6 text-amber-300" />
                  League ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="players" className="w-full">
                  <TabsList className="mb-4 grid grid-cols-2 gap-2 bg-slate-950/60">
                    <TabsTrigger
                      value="players"
                      className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
                    >
                      Players
                    </TabsTrigger>
                    <TabsTrigger
                      value="teams"
                      className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
                    >
                      Teams
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="players">
                    {renderRankingTabs(metricGroups, rankingsByMetric, true, false)}
                  </TabsContent>
                  <TabsContent value="teams">
                    {renderRankingTabs(teamMetricGroups, teamRankingsByMetric, false, true)}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </div>
  )
}

