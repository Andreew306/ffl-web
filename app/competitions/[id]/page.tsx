import dbConnect from "@/lib/db/mongoose"
import CompetitionModel from "@/lib/models/Competition"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import MatchModel from "@/lib/models/Match"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import CompetitionDetailTabs from "./CompetitionDetailTabs"
import { notFound } from "next/navigation"
import "@/lib/models/Team"

type CompetitionDoc = {
  _id: string
  competition_id?: number
  season_id?: number | string
  season?: number | string
  division?: number
  start_date?: Date | string
  end_date?: Date | string
  type?: string
  name?: string
}

type TeamDoc = {
  _id?: { toString(): string }
  teamName?: string
  team_name?: string
  image?: string
  country?: string
}

type TeamCompetitionRow = {
  _id?: unknown
  team_id?: TeamDoc
}

type MatchDoc = {
  _id?: unknown
  date?: Date | string
  comments?: string
  team1_competition_id?: { team_id?: TeamDoc }
  team2_competition_id?: { team_id?: TeamDoc }
  score_team1?: number
  scoreTeam1?: number
  score_team2?: number
  scoreTeam2?: number
}

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

type ParticipantRow = {
  id: string
  name: string
  image: string
  country: string
}

type StandingStat = {
  id: string
  name: string
  image: string
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  goalsScored: number
  goalsConceded: number
  points: number
}

function formatCompetitionTitle(competition: CompetitionDoc | null) {
  if (!competition) return "Competition"
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
      return season ? `Season ${season}, Cup` : "Cup"
    case "supercup":
      return season ? `Season ${season}, Supercup` : "Supercup"
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return competition.name || "Competition"
}

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  await dbConnect()

  const { id } = await params
  const numericId = Number(id)
  const competition: CompetitionDoc | null =
    (Number.isFinite(numericId) &&
      (await CompetitionModel.findOne({ competition_id: numericId }).lean<CompetitionDoc | null>())) ||
    (await CompetitionModel.findById(id).lean<CompetitionDoc | null>())

  if (!competition) return notFound()

  const teamCompetitions = await TeamCompetitionModel.find({ competition_id: competition._id })
    .populate({ path: "team_id" })
    .lean<TeamCompetitionRow[]>()
  const teamCompetitionObjectIds = teamCompetitions.map((row) => row._id).filter(Boolean)

  const matches = await MatchModel.find({ competition_id: competition._id })
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id" },
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id" },
    })
    .lean<MatchDoc[]>()

  const scoringFeats = teamCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.aggregate([
        { $match: { team_competition_id: { $in: teamCompetitionObjectIds } } },
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
    : []

  const playerTotalsRaw = teamCompetitionObjectIds.length
    ? await PlayerCompetitionModel.aggregate([
        { $match: { team_competition_id: { $in: teamCompetitionObjectIds } } },
        {
          $group: {
            _id: { playerId: "$player_id", teamCompetitionId: "$team_competition_id" },
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
            shotsDefended: { $sum: "$shots_defended" },
            saves: { $sum: "$saves" },
            recoveries: { $sum: "$recoveries" },
            clearances: { $sum: "$clearances" },
            goalsConceded: { $sum: "$goals_conceded" },
            cs: { $sum: "$cs" },
            owngoals: { $sum: "$owngoals" },
            avgSum: { $sum: "$avg" },
            avgCount: { $sum: 1 },
            TOTW: { $sum: "$TOTW" },
            MVP: { $sum: "$MVP" },
            hasGK: { $max: { $cond: [{ $eq: ["$position", "GK"] }, 1, 0] } },
          },
        },
        { $sort: { matchesPlayedTeam: -1 } },
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
    : []

  const teamGoalsByPlayerRaw = teamCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.aggregate([
        { $match: { team_competition_id: { $in: teamCompetitionObjectIds } } },
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
    : []

  const teamTotalsRaw = await TeamCompetitionModel.aggregate([
    { $match: { competition_id: competition._id } },
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

  const participantsMap = teamCompetitions.reduce<Record<string, ParticipantRow>>((acc, row) => {
    const team = row.team_id
    if (!team) return acc
    const teamId = team._id?.toString()
    if (!teamId) return acc
    if (!acc[teamId]) {
      acc[teamId] = {
        id: teamId,
        name: team.teamName || team.team_name || "Team",
        image: team.image || "",
        country: team.country || "",
      }
    }
    return acc
  }, {})

  const participants = Object.values(participantsMap)

  const standingsMap = matches.reduce<Record<string, StandingStat>>((acc, match) => {
    const team1Competition = match.team1_competition_id
    const team2Competition = match.team2_competition_id
    const team1 = team1Competition?.team_id
    const team2 = team2Competition?.team_id
    const team1Id = team1?._id?.toString()
    const team2Id = team2?._id?.toString()
    const scoreA = Number(match.score_team1 ?? match.scoreTeam1)
    const scoreB = Number(match.score_team2 ?? match.scoreTeam2)
    if (!team1Id || !team2Id) return acc
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return acc

    const ensure = (teamId: string, meta?: TeamDoc) => {
      if (!acc[teamId]) {
        acc[teamId] = {
          id: teamId,
          name: meta?.teamName || meta?.team_name || "Team",
          image: meta?.image || "",
          matchesPlayed: 0,
          matchesWon: 0,
          matchesDraw: 0,
          matchesLost: 0,
          goalsScored: 0,
          goalsConceded: 0,
          points: 0,
        }
      }
      return acc[teamId]
    }

    const teamA = ensure(team1Id, team1)
    const teamB = ensure(team2Id, team2)

    teamA.matchesPlayed += 1
    teamB.matchesPlayed += 1
    teamA.goalsScored += scoreA
    teamA.goalsConceded += scoreB
    teamB.goalsScored += scoreB
    teamB.goalsConceded += scoreA

    if (scoreA > scoreB) {
      teamA.matchesWon += 1
      teamB.matchesLost += 1
      teamA.points += 3
    } else if (scoreA < scoreB) {
      teamB.matchesWon += 1
      teamA.matchesLost += 1
      teamB.points += 3
    } else {
      teamA.matchesDraw += 1
      teamB.matchesDraw += 1
      teamA.points += 1
      teamB.points += 1
    }

    return acc
  }, {})

  const standings = participants.map((team) => {
    const stats = standingsMap[team.id] || {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesDraw: 0,
      matchesLost: 0,
      goalsScored: 0,
      goalsConceded: 0,
      points: 0,
    }
    return {
      id: team.id,
      name: team.name,
      image: team.image,
      matchesPlayed: stats.matchesPlayed,
      matchesWon: stats.matchesWon,
      matchesDraw: stats.matchesDraw,
      matchesLost: stats.matchesLost,
      goalsScored: stats.goalsScored,
      goalsConceded: stats.goalsConceded,
      points: stats.points,
    }
  })
  .sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const aDiff = a.goalsScored - a.goalsConceded
    const bDiff = b.goalsScored - b.goalsConceded
    if (bDiff !== aDiff) return bDiff - aDiff
    if (b.goalsScored !== a.goalsScored) return b.goalsScored - a.goalsScored
    return a.name.localeCompare(b.name)
  })

  const matchRows = matches.flatMap((match) => {
    const id = match._id?.toString()
    if (!id) return []
    const teamA = match.team1_competition_id?.team_id
    const teamB = match.team2_competition_id?.team_id
    return [
      {
        id,
        date: match.date ? new Date(match.date).toLocaleDateString("en-GB") : "",
        teamA: teamA?.teamName || teamA?.team_name || "Team A",
        teamB: teamB?.teamName || teamB?.team_name || "Team B",
        teamAImage: teamA?.image || "",
        teamBImage: teamB?.image || "",
        scoreA: match.score_team1 ?? match.scoreTeam1,
        scoreB: match.score_team2 ?? match.scoreTeam2,
      },
    ]
  })

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

  const players = (playerTotalsRaw as PlayerTotalsRow[]).map((row) => ({
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
  const teams = (teamTotalsRaw as TeamTotalsRow[]).map((row) => ({
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

  const totalGoals = standings.reduce((sum, row) => sum + row.goalsScored, 0)
  const totalCleanSheets = teams.reduce((sum, row) => sum + row.cs, 0)
  const stats = {
    teams: participants.length,
    matches: matchRows.length,
    goals: totalGoals,
    goalsPerMatch: matchRows.length ? totalGoals / matchRows.length : 0,
    cleanSheets: totalCleanSheets,
    deffwinMatches: matches.filter((match) =>
      String(match.comments || "").toLowerCase().includes("deffwin")
    ).length,
  }

  const title = formatCompetitionTitle(competition)
  const subtitle = competition.type ? competition.type.replace("_", " ") : "competition"

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-10 space-y-8">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/30 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{subtitle}</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <div className="mt-3 text-sm text-slate-400">
            {competition.start_date
              ? new Date(competition.start_date).toLocaleDateString("en-GB")
              : "-"}{" "}
            -{" "}
            {competition.end_date
              ? new Date(competition.end_date).toLocaleDateString("en-GB")
              : "-"}
          </div>
        </section>

        <CompetitionDetailTabs
          participants={participants}
          standings={standings}
          matches={matchRows}
          stats={stats}
          players={players}
          teams={teams}
        />
      </div>
    </div>
  )
}
