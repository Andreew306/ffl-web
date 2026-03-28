import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import UserModel, { type IUserRole } from "@/lib/models/User"
import PlayerModel from "@/lib/models/Player"

type ProfileStats = {
  matchesPlayed: number
  matchesWon: number
  goals: number
  assists: number
  preassists: number
  cleanSheets: number
  mvp: number
  totw: number
  kicks: number
  braces: number
  hatTricks: number
  pokers: number
  seasonsPlayed: number
  sameTeamSeasonsMax: number
  goalMinutesCovered: number
  nationsParticipations: number
  teamsPlayed: number
  versatileCoverage: number
  doubleDoubleSeasons: number
  invincibleLeagues: number
  captaincies: number
  impactSubMatches: number
  teamsOverFourMatches: number
  fullShiftMatches: number
  ownGoals: number
  doubleThreatMatches: number
  allStarTitles: number
  mercyWins: number
  comebackWins: number
  leagueTitles: number
  summerTitles: number
  rookiePlaceholder: number
  openingStrikeGoals: number
  cupTitles: number
  supercupTitles: number
  silentGeniusMatches: number
  lateHeroWins: number
  perfectStartSeasons: number
  trebleSeasons: number
  nationsTitles: number
  bigNightMatches: number
  seasonInvictos: number
  bestAwards: number
  doubleCenturyCareer: number
  championPlaceholder: number
  fusionPlaceholder: number
}

type ObjectiveDefinition = {
  key: string
  label: string
  description: string
  target: number
  stat: keyof ProfileStats
  category: string
}

export type ProfileObjective = ObjectiveDefinition & {
  current: number
  completed: boolean
}

export type UserProfileData = {
  user: {
    discordId: string
    roles: IUserRole[]
    playerId: string | null
  }
  player: {
    id: string
    playerId: number
    name: string
    country: string
    avatar?: string
  } | null
  stats: ProfileStats
  objectives: ProfileObjective[]
}

function createMilestoneObjectives(
  category: string,
  stat: keyof ProfileStats,
  milestones: number[],
  labelBuilder: (target: number) => string,
  descriptionBuilder: (target: number) => string
) {
  return milestones.map((target) => ({
    key: `${category.toLowerCase()}-${target}`,
    category,
    label: labelBuilder(target),
    description: descriptionBuilder(target),
    target,
    stat,
  }))
}

const objectiveDefinitions: ObjectiveDefinition[] = [
  // ── Main offensive ──────────────────────────────────────────────────────────
  ...createMilestoneObjectives(
    "Matches", "matchesPlayed", [1, 5, 10, 25, 50, 75, 100],
    (t) => t === 1 ? "Debut" : t === 5 ? "Getting Started" : t === 10 ? "Regular" : t === 25 ? "Established" : t === 50 ? "Veteran" : t === 75 ? "Mainstay" : "Centurion",
    (t) => t === 1 ? "Play your first official match." : t === 5 ? "Play 5 official matches." : t === 10 ? "Play 10 official matches." : t === 25 ? "Play 25 official matches." : t === 50 ? "Play 50 official matches." : t === 75 ? "Play 75 official matches." : "Play 100 official matches."
  ),
  ...createMilestoneObjectives(
    "Goals", "goals", [1, 5, 10, 25, 50, 100, 250],
    (t) => t === 1 ? "First Strike" : t === 5 ? "Finisher" : t === 10 ? "Goalscorer" : t === 25 ? "Striker" : t === 50 ? "Sharpshoot" : t === 100 ? "Deadly" : "Fusion Scorer",
    (t) => t === 1 ? "Score your first official goal." : t === 5 ? "Score 5 official goals." : t === 10 ? "Score 10 official goals." : t === 25 ? "Score 25 official goals." : t === 50 ? "Score 50 official goals." : t === 100 ? "Score 100 official goals." : "Score 250 official goals."
  ),
  ...createMilestoneObjectives(
    "Seasons", "seasonsPlayed", [1, 3, 5, 7, 10],
    (t) => t === 1 ? "First Season" : t === 3 ? "Seasoned" : t === 10 ? "Mr. Unemployed" : `${t} Seasons`,
    (t) => t === 1 ? "Play your first official season." : t === 3 ? "Play 3 different official seasons." : t === 10 ? "Play 10 different official seasons." : `Play ${t} different official seasons.`
  ),
  ...createMilestoneObjectives(
    "Teams", "teamsPlayed", [1, 3, 5, 7, 10],
    (t) => t === 1 ? "First Team" : `${t} Teams`,
    (t) => t === 1 ? "Play for your first team." : `Play for ${t} different teams.`
  ),
  ...createMilestoneObjectives(
    "Assists", "assists", [1, 5, 10, 25, 50, 100, 250],
    (t) => t === 1 ? "Provider" : t === 5 ? "Creator" : t === 10 ? "Playmaker" : t === 25 ? "Architect" : t === 50 ? "Visionary" : t === 100 ? "Mastermind" : "Fusion Assister",
    (t) => t === 1 ? "Deliver your first official assist." : t === 5 ? "Deliver 5 official assists." : t === 10 ? "Deliver 10 official assists." : t === 25 ? "Deliver 25 official assists." : t === 50 ? "Deliver 50 official assists." : t === 100 ? "Deliver 100 official assists." : "Deliver 250 official assists."
  ),
  ...createMilestoneObjectives(
    "Wins", "matchesWon", [1, 5, 10, 25, 50, 75, 100],
    (t) => t === 1 ? "Winner" : t === 5 ? "Contender" : t === 10 ? "Competitor" : t === 25 ? "Closer" : t === 50 ? "Champion" : t === 75 ? "Dominant" : "Dynasty",
    (t) => t === 1 ? "Get your first official win." : t === 5 ? "Get 5 official wins." : t === 10 ? "Get 10 official wins." : t === 25 ? "Get 25 official wins." : t === 50 ? "Get 50 official wins." : t === 75 ? "Get 75 official wins." : "Get 100 official wins."
  ),
  // ── Awards ──────────────────────────────────────────────────────────────────
  ...createMilestoneObjectives(
    "MVP", "mvp", [1, 5, 10, 15, 20, 25, 30],
    (t) => t === 1 ? "Star" : t === 5 ? "Showman" : t === 10 ? "Franchise" : t === 15 ? "Superstar" : t === 20 ? "Icon" : t === 25 ? "Legend" : "Immortal",
    (t) => t === 1 ? "Earn your first official MVP." : t === 5 ? "Earn 5 official MVPs." : t === 10 ? "Earn 10 official MVPs." : t === 15 ? "Earn 15 official MVPs." : t === 20 ? "Earn 20 official MVPs." : t === 25 ? "Earn 25 official MVPs." : "Earn 30 official MVPs."
  ),
  ...createMilestoneObjectives(
    "TOTW", "totw", [1, 5, 10, 15, 20, 25, 30],
    (t) => t === 1 ? "Call-Up" : t === 5 ? "Recognized" : t === 10 ? "Standout" : t === 15 ? "Elite" : t === 20 ? "Top Class" : t === 25 ? "World Class" : "Hall of Fame",
    (t) => t === 1 ? "Make the Team of the Week." : t === 5 ? "Make the Team of the Week 5 times." : t === 10 ? "Make the Team of the Week 10 times." : t === 15 ? "Make the Team of the Week 15 times." : t === 20 ? "Make the Team of the Week 20 times." : t === 25 ? "Make the Team of the Week 25 times." : "Make the Team of the Week 30 times."
  ),
  // ── Defensive ───────────────────────────────────────────────────────────────
  ...createMilestoneObjectives(
    "CS", "cleanSheets", [1, 5, 10, 25, 50, 75, 100],
    (t) => t === 1 ? "Clean Sheet" : t === 5 ? "Safe Hands" : t === 10 ? "Solid" : t === 25 ? "Reliable" : t === 50 ? "Guardian" : t === 75 ? "Fortress" : "Fusion Keeper",
    (t) => t === 1 ? "Get your first official clean sheet." : t === 5 ? "Get 5 official clean sheets." : t === 10 ? "Get 10 official clean sheets." : t === 25 ? "Get 25 official clean sheets." : t === 50 ? "Get 50 official clean sheets." : t === 75 ? "Get 75 official clean sheets." : "Get 100 official clean sheets."
  ),
  // ── Technical ───────────────────────────────────────────────────────────────
  ...createMilestoneObjectives(
    "Kicks", "kicks", [100, 500, 1000, 2500, 5000, 7500, 10000],
    (t) => t === 100 ? "First Touch" : t === 500 ? "Involved" : t === 1000 ? "Busy Feet" : t === 2500 ? "Ball Magnet" : t === 5000 ? "Ever-Present" : t === 7500 ? "Everywhere" : "Omnipresent",
    (t) => `Accumulate ${t} total kicks.`
  ),
  // ── Sub-branches from Goals ──────────────────────────────────────────────────
  ...createMilestoneObjectives(
    "Braces", "braces", [1, 5, 10, 15, 20, 25, 30],
    (t) => t === 1 ? "First Brace" : `${t} Braces`,
    (t) => t === 1 ? "Score 2 goals in a single match." : `Score 2+ goals in ${t} different matches.`
  ),
  ...createMilestoneObjectives(
    "HatTricks", "hatTricks", [1, 5, 10, 15, 20, 25, 30],
    (t) => t === 1 ? "Hat-Trick" : `${t} Hat-Tricks`,
    (t) => t === 1 ? "Score 3 goals in a single match." : `Score 3+ goals in ${t} different matches.`
  ),
  ...createMilestoneObjectives(
    "Pokers", "pokers", [1, 5, 10, 15, 20, 25, 30],
    (t) => t === 1 ? "Poker" : `${t} Pokers`,
    (t) => t === 1 ? "Score 4 or more goals in a single match." : `Score 4+ goals in ${t} different matches.`
  ),
  // ── Sub-branch from Assists ──────────────────────────────────────────────────
  ...createMilestoneObjectives(
    "PreAssists", "preassists", [1, 5, 10, 25, 50, 100, 250],
    (t) => t === 1 ? "First Pre-Assist" : `${t} Pre-Assists`,
    (t) => t === 1 ? "Deliver your first official pre-assist." : `Deliver ${t} official pre-assists.`
  ),
  {
    key: "one-club-man",
    category: "Badges",
    label: "One Club Man",
    description: "Play 5 different seasons with the same team.",
    target: 5,
    stat: "sameTeamSeasonsMax",
  },
  {
    key: "goal-minutes-0-20",
    category: "Badges",
    label: "Full Timeline",
    description: "Score at least one goal in every minute from 0 to 20.",
    target: 21,
    stat: "goalMinutesCovered",
  },
  {
    key: "nations",
    category: "Badges",
    label: "Nations",
    description: "Participate in at least one Nations Cup.",
    target: 1,
    stat: "nationsParticipations",
  },
  {
    key: "all-stars",
    category: "Badges",
    label: "All Stars",
    description: "Win an All Stars, Future Stars, or Rising Stars.",
    target: 1,
    stat: "allStarTitles",
  },
  {
    key: "rookie-placeholder-3",
    category: "Badges",
    label: "TBD",
    description: "Row III badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-4a",
    category: "Badges",
    label: "TBD",
    description: "Row IV badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-4b",
    category: "Badges",
    label: "TBD",
    description: "Row IV badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-4c",
    category: "Badges",
    label: "TBD",
    description: "Row IV badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-4d",
    category: "Badges",
    label: "TBD",
    description: "Row IV badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-5a",
    category: "Badges",
    label: "TBD",
    description: "Row V badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-5b",
    category: "Badges",
    label: "TBD",
    description: "Row V badge to be defined.",
    target: 1,
    stat: "rookiePlaceholder",
  },
  {
    key: "placeholder-6a",
    category: "Badges",
    label: "TBD",
    description: "Row VI badge to be defined.",
    target: 1,
    stat: "championPlaceholder",
  },
  {
    key: "placeholder-7a",
    category: "Badges",
    label: "TBD",
    description: "Row VII badge to be defined.",
    target: 1,
    stat: "fusionPlaceholder",
  },
  {
    key: "versatile",
    category: "Badges",
    label: "Versatile",
    description: "Play at least one match in GK, CB, CM, LW or RW, and ST.",
    target: 5,
    stat: "versatileCoverage",
  },
  {
    key: "double-double",
    category: "Badges",
    label: "Double Double",
    description: "Reach 10+ goals and 10+ assists in the same season.",
    target: 1,
    stat: "doubleDoubleSeasons",
  },
  {
    key: "invincible",
    category: "Badges",
    label: "Invincible",
    description: "Finish a season unbeaten with more than 5 matches played.",
    target: 1,
    stat: "seasonInvictos",
  },
  {
    key: "captain",
    category: "Badges",
    label: "Captain",
    description: "Serve as captain or vice-captain for any team.",
    target: 1,
    stat: "captaincies",
  },
  {
    key: "impact-sub",
    category: "Badges",
    label: "Impact Sub",
    description: "Score or assist after coming on as a substitute.",
    target: 1,
    stat: "impactSubMatches",
  },
  {
    key: "new-colours",
    category: "Badges",
    label: "New Colours",
    description: "Play for 2 different teams with 4+ matches each.",
    target: 2,
    stat: "teamsOverFourMatches",
  },
  {
    key: "full-shift",
    category: "Badges",
    label: "Full Shift",
    description: "Play a full match without being substituted.",
    target: 1,
    stat: "fullShiftMatches",
  },
  {
    key: "ups",
    category: "Badges",
    label: "Ups",
    description: "Score 1 own goal.",
    target: 1,
    stat: "ownGoals",
  },
  {
    key: "double-threat",
    category: "Badges",
    label: "Double Threat",
    description: "Score and assist in the same match.",
    target: 1,
    stat: "doubleThreatMatches",
  },
  {
    key: "no-mercy",
    category: "Badges",
    label: "No Mercy",
    description: "Win by mercy with a 7+ goal difference.",
    target: 1,
    stat: "mercyWins",
  },
  {
    key: "comeback",
    category: "Badges",
    label: "Comeback",
    description: "Come back to win a match.",
    target: 1,
    stat: "comebackWins",
  },
  {
    key: "league-winner",
    category: "Badges",
    label: "League Winner",
    description: "Win a league with your team.",
    target: 1,
    stat: "leagueTitles",
  },
  {
    key: "summer-winner",
    category: "Badges",
    label: "Summer Winner",
    description: "Win a Summer Cup with your team.",
    target: 1,
    stat: "summerTitles",
  },
  {
    key: "globetrotter",
    category: "Badges",
    label: "Globetrotter",
    description: "Play for 10 different teams with 4+ matches each.",
    target: 10,
    stat: "teamsOverFourMatches",
  },
  {
    key: "opening-strike",
    category: "Badges",
    label: "Opening Strike",
    description: "Score a goal at minute 0.",
    target: 1,
    stat: "openingStrikeGoals",
  },
  {
    key: "silent-genius",
    category: "Badges",
    label: "Silent Genius",
    description: "Make 3 pre-assists in a single match.",
    target: 1,
    stat: "silentGeniusMatches",
  },
  {
    key: "late-hero",
    category: "Badges",
    label: "Late Hero",
    description: "Score the winning goal in minute 19 or 20.",
    target: 1,
    stat: "lateHeroWins",
  },
  {
    key: "cup-winner",
    category: "Badges",
    label: "Cup Winner",
    description: "Win a cup with your team.",
    target: 1,
    stat: "cupTitles",
  },
  {
    key: "supercup-winner",
    category: "Badges",
    label: "Supercup Winner",
    description: "Win a supercup with your team.",
    target: 1,
    stat: "supercupTitles",
  },
  {
    key: "perfect-start",
    category: "Badges",
    label: "Perfect Start",
    description: "Score in your first 3 matches of a season.",
    target: 1,
    stat: "perfectStartSeasons",
  },
  {
    key: "treble",
    category: "Badges",
    label: "Treble",
    description: "Win league, cup, and supercup in the same season.",
    target: 1,
    stat: "trebleSeasons",
  },
  {
    key: "nations-winner",
    category: "Badges",
    label: "Nations",
    description: "Win a Nations Cup with your team.",
    target: 1,
    stat: "nationsTitles",
  },
  {
    key: "big-night",
    category: "Badges",
    label: "Big Night",
    description: "Score 3+ goals and deliver 3+ assists in the same match.",
    target: 1,
    stat: "bigNightMatches",
  },
  {
    key: "league-dynasty",
    category: "Badges",
    label: "League Dynasty",
    description: "Win 5 leagues with your team.",
    target: 5,
    stat: "leagueTitles",
  },
  {
    key: "best-award",
    category: "Badges",
    label: "Best Winner",
    description: "Win a Best GK, Best Defender, Best Midfielder, Best Attacker, or Best MVP award.",
    target: 1,
    stat: "bestAwards",
  },
  {
    key: "double-century",
    category: "Badges",
    label: "Dual Centurion",
    description: "Reach 100+ goals and 100+ assists in your career.",
    target: 1,
    stat: "doubleCenturyCareer",
  },
]

function normalizeRoles(roles?: Array<IUserRole | string>) {
  return (roles ?? [])
    .map((role) => {
      if (typeof role === "string") return { id: role, name: role }
      if (role?.id && role?.name) return role
      return null
    })
    .filter((role): role is IUserRole => Boolean(role))
}

const ZERO_STATS: ProfileStats = {
  matchesPlayed: 0, matchesWon: 0, goals: 0, assists: 0, preassists: 0,
  cleanSheets: 0, mvp: 0, totw: 0, kicks: 0, braces: 0, hatTricks: 0, pokers: 0,
  seasonsPlayed: 0, sameTeamSeasonsMax: 0, goalMinutesCovered: 0, nationsParticipations: 0,
  teamsPlayed: 0, versatileCoverage: 0, doubleDoubleSeasons: 0, invincibleLeagues: 0, captaincies: 0,
  impactSubMatches: 0, teamsOverFourMatches: 0, fullShiftMatches: 0, ownGoals: 0, doubleThreatMatches: 0,
  allStarTitles: 0, mercyWins: 0, comebackWins: 0, leagueTitles: 0, summerTitles: 0, rookiePlaceholder: 0, openingStrikeGoals: 0,
  cupTitles: 0, supercupTitles: 0, silentGeniusMatches: 0, lateHeroWins: 0, perfectStartSeasons: 0,
  trebleSeasons: 0, nationsTitles: 0, bigNightMatches: 0, seasonInvictos: 0, bestAwards: 0, doubleCenturyCareer: 0, championPlaceholder: 0, fusionPlaceholder: 0,
}

export async function getUserProfileData(discordId: string): Promise<UserProfileData | null> {
  await dbConnect()
  const db = mongoose.connection.db
  if (!db) throw new Error("Database connection not initialized")

  const user = await UserModel.findOne({ discordId })
    .select("discordId playerId roles")
    .lean<{ discordId: string; playerId?: mongoose.Types.ObjectId | null; roles?: Array<IUserRole | string> } | null>()

  if (!user) return null

  const normalizedUserRoles = normalizeRoles(user.roles)
  const playerObjectId = user.playerId?.toString() || null

  if (!playerObjectId) {
    return {
      user: { discordId: user.discordId, roles: normalizedUserRoles, playerId: null },
      player: null,
      stats: ZERO_STATS,
      objectives: objectiveDefinitions.map((o) => ({ ...o, current: 0, completed: false })),
    }
  }

  const playerOid = new mongoose.Types.ObjectId(playerObjectId)

  // Run all aggregations in parallel
  const [player, statsRow, multiGoalRow, seasonsRow, goalMinutesRow, nationsRow, versatileRow, doubleDoubleRow, invincibleRow, seasonInvictosRow, teamsRow, captainRow, rookieBadgesRow, matchBadgeRows, titleRows, titleSeasonRows, seasonMatchRows] = await Promise.all([
    PlayerModel.findById(playerObjectId)
      .select("_id player_id player_name country avatar")
      .lean<{ _id: mongoose.Types.ObjectId; player_id: number; player_name: string; country: string; avatar?: string } | null>(),

    // Aggregate career totals from playercompetitions
    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $group: {
          _id: "$player_id",
          matchesPlayed: { $sum: { $ifNull: ["$matchesPlayed", { $ifNull: ["$matches_played", 0] }] } },
          matchesWon:    { $sum: { $ifNull: ["$matchesWon",    { $ifNull: ["$matches_won", 0] }] } },
          goals:         { $sum: { $ifNull: ["$goals",         0] } },
          assists:       { $sum: { $ifNull: ["$assists",       0] } },
          preassists:    { $sum: { $ifNull: ["$preassists",    0] } },
          cleanSheets:   { $sum: { $ifNull: ["$cs",            0] } },
          mvp:           { $sum: { $ifNull: ["$MVP",           0] } },
          totw:          { $sum: { $ifNull: ["$TOTW",          0] } },
          kicks:         { $sum: { $ifNull: ["$kicks",         0] } },
          ownGoals:      { $sum: { $ifNull: ["$owngoals",      0] } },
        },
      },
    ]).next(),

    // Count brace / hat-trick / poker matches from playermatchstats via lookup
    db.collection("playermatchstats").aggregate([
      {
        $lookup: {
          from: "playercompetitions",
          localField: "player_competition_id",
          foreignField: "_id",
          as: "pc",
        },
      },
      { $match: { "pc.player_id": playerOid } },
      {
        $group: {
          _id: null,
          braces:    { $sum: { $cond: [{ $gte: ["$goals", 2] }, 1, 0] } },
          hatTricks: { $sum: { $cond: [{ $gte: ["$goals", 3] }, 1, 0] } },
          pokers:    { $sum: { $cond: [{ $gte: ["$goals", 4] }, 1, 0] } },
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      { $match: { "competition.type": "league" } },
      {
        $project: {
          seasonKey: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$competition.start_date",
            },
          },
          matchesLost: { $ifNull: ["$matchesLost", { $ifNull: ["$matches_lost", 0] }] },
          matchesPlayed: { $ifNull: ["$matchesPlayed", { $ifNull: ["$matches_played", 0] }] },
        },
      },
      {
        $group: {
          _id: "$seasonKey",
          matchesLost: { $sum: "$matchesLost" },
          matchesPlayed: { $sum: "$matchesPlayed" },
        },
      },
      {
        $group: {
          _id: null,
          seasonInvictos: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$matchesPlayed", 5] }, { $eq: ["$matchesLost", 0] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      {
        $project: {
          teamId: "$teamCompetition.team_id",
          competitionType: "$competition.type",
          seasonKey: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$competition.start_date",
            },
          },
        },
      },
      { $match: { seasonKey: { $nin: [null, ""] }, competitionType: "league" } },
      {
        $group: {
          _id: null,
          seasons: { $addToSet: "$seasonKey" },
          teamSeasonPairs: { $addToSet: { teamId: "$teamId", seasonKey: "$seasonKey" } },
        },
      },
      {
        $project: {
          seasonsPlayed: { $size: "$seasons" },
          sameTeamSeasonsMax: {
            $let: {
              vars: {
                perTeam: {
                  $map: {
                    input: {
                      $setUnion: [
                        [],
                        { $map: { input: "$teamSeasonPairs", as: "pair", in: "$$pair.teamId" } },
                      ],
                    },
                    as: "teamId",
                    in: {
                      $size: {
                        $filter: {
                          input: "$teamSeasonPairs",
                          as: "pair",
                          cond: { $eq: ["$$pair.teamId", "$$teamId"] },
                        },
                      },
                    },
                  },
                },
              },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$perTeam" }, 0] },
                  { $max: "$$perTeam" },
                  0,
                ],
              },
            },
          },
        },
      },
    ]).next(),

    db.collection("goals").aggregate([
      {
        $lookup: {
          from: "playercompetitions",
          localField: "scorer_id",
          foreignField: "_id",
          as: "playerCompetition",
        },
      },
      { $match: { "playerCompetition.player_id": playerOid, minute: { $gte: 0, $lte: 20 } } },
      {
        $group: {
          _id: null,
          coveredMinutes: { $addToSet: "$minute" },
        },
      },
      {
        $project: {
          goalMinutesCovered: { $size: "$coveredMinutes" },
          openingStrikeGoals: {
            $size: {
              $filter: {
                input: "$coveredMinutes",
                as: "minute",
                cond: { $eq: ["$$minute", 0] },
              },
            },
          },
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      { $match: { "competition.type": "nations_cup" } },
      {
        $group: {
          _id: null,
          competitions: { $addToSet: "$teamCompetition.competition_id" },
        },
      },
      {
        $project: {
          nationsParticipations: { $size: "$competitions" },
        },
      },
    ]).next(),

    db.collection("playermatchstats").aggregate([
      {
        $lookup: {
          from: "playercompetitions",
          localField: "player_competition_id",
          foreignField: "_id",
          as: "pc",
        },
      },
      { $match: { "pc.player_id": playerOid } },
      {
        $project: {
          position: "$position",
          group: {
            $switch: {
              branches: [
                { case: { $eq: ["$position", "GK"] }, then: "gk" },
                { case: { $eq: ["$position", "CB"] }, then: "cb" },
                { case: { $eq: ["$position", "CM"] }, then: "cm" },
                { case: { $in: ["$position", ["LW", "RW"]] }, then: "wing" },
                { case: { $eq: ["$position", "ST"] }, then: "st" },
              ],
              default: null,
            },
          },
        },
      },
      { $match: { group: { $ne: null } } },
      {
        $group: {
          _id: null,
          groups: { $addToSet: "$group" },
        },
      },
      {
        $project: {
          versatileCoverage: { $size: "$groups" },
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      { $match: { "competition.type": "league" } },
      {
        $project: {
          seasonKey: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$competition.start_date",
            },
          },
          competitionId: "$teamCompetition.competition_id",
          goals: { $ifNull: ["$goals", 0] },
          assists: { $ifNull: ["$assists", 0] },
          matchesLost: { $ifNull: ["$matchesLost", { $ifNull: ["$matches_lost", 0] }] },
          matchesPlayed: { $ifNull: ["$matchesPlayed", { $ifNull: ["$matches_played", 0] }] },
        },
      },
      {
        $group: {
          _id: "$seasonKey",
          goals: { $sum: "$goals" },
          assists: { $sum: "$assists" },
        },
      },
      {
        $group: {
          _id: null,
          doubleDoubleSeasons: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$goals", 10] }, { $gte: ["$assists", 10] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      { $match: { "competition.type": "league" } },
      {
        $project: {
          competitionId: "$teamCompetition.competition_id",
          matchesLost: { $ifNull: ["$matchesLost", { $ifNull: ["$matches_lost", 0] }] },
          matchesPlayed: { $ifNull: ["$matchesPlayed", { $ifNull: ["$matches_played", 0] }] },
        },
      },
      {
        $group: {
          _id: "$competitionId",
          matchesLost: { $sum: "$matchesLost" },
          matchesPlayed: { $sum: "$matchesPlayed" },
        },
      },
      {
        $group: {
          _id: null,
          invincibleLeagues: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$matchesPlayed", 4] }, { $eq: ["$matchesLost", 0] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $group: {
          _id: "$teamCompetition.team_id",
          matchesPlayed: {
            $sum: { $ifNull: ["$matchesPlayed", { $ifNull: ["$matches_played", 0] }] },
          },
        },
      },
      {
        $group: {
          _id: null,
          teamsPlayed: { $sum: 1 },
          teamsOverFourMatches: {
            $sum: {
              $cond: [{ $gt: ["$matchesPlayed", 4] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          teamsPlayed: 1,
          teamsOverFourMatches: 1,
        },
      },
    ]).next(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $project: {
          leadership: {
            $cond: [
              {
                $or: [
                  { $eq: ["$is_captain", true] },
                  { $eq: ["$is_subcaptain", true] },
                  { $eq: ["$isCaptain", true] },
                  { $eq: ["$isSubcaptain", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          captaincies: { $max: "$leadership" },
        },
      },
    ]).next(),

    db.collection("playermatchstats").aggregate([
      {
        $lookup: {
          from: "playercompetitions",
          localField: "player_competition_id",
          foreignField: "_id",
          as: "pc",
        },
      },
      { $match: { "pc.player_id": playerOid } },
      {
        $lookup: {
          from: "playermatchstats",
          localField: "match_id",
          foreignField: "match_id",
          as: "sameMatchStats",
        },
      },
      {
        $project: {
          substitute: { $ifNull: ["$substitute", 0] },
          starter: { $ifNull: ["$starter", 0] },
          goals: { $ifNull: ["$goals", 0] },
          assists: { $ifNull: ["$assists", 0] },
          minutesPlayed: { $ifNull: ["$minutes_played", { $ifNull: ["$minutesPlayed", 0] }] },
          matchMaxMinutes: {
            $max: {
              $map: {
                input: "$sameMatchStats",
                as: "row",
                in: { $ifNull: ["$$row.minutes_played", { $ifNull: ["$$row.minutesPlayed", 0] }] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          impactSubMatches: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$substitute", 0] },
                    { $or: [{ $gt: ["$goals", 0] }, { $gt: ["$assists", 0] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          fullShiftMatches: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$starter", 0] },
                    { $eq: ["$substitute", 0] },
                    { $gte: ["$minutesPlayed", { $subtract: ["$matchMaxMinutes", 20] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          doubleThreatMatches: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$goals", 0] }, { $gt: ["$assists", 0] }] },
                1,
                0,
              ],
            },
          },
          bigNightMatches: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$goals", 3] }, { $gte: ["$assists", 3] }] },
                1,
                0,
              ],
            },
          },
          silentGeniusMatches: {
            $sum: {
              $cond: [
                { $gte: [{ $ifNull: ["$preassists", 0] }, 3] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).next(),

    db.collection("playermatchstats").aggregate([
      {
        $lookup: {
          from: "playercompetitions",
          localField: "player_competition_id",
          foreignField: "_id",
          as: "pc",
        },
      },
      { $match: { "pc.player_id": playerOid } },
      {
        $lookup: {
          from: "matches",
          localField: "match_id",
          foreignField: "_id",
          as: "match",
        },
      },
      { $unwind: "$match" },
      {
        $project: {
          playerCompetitionId: "$player_competition_id",
          teamCompetitionId: "$team_competition_id",
          matchId: "$match._id",
          team1CompetitionId: "$match.team1_competition_id",
          team2CompetitionId: "$match.team2_competition_id",
          scoreTeam1: { $ifNull: ["$match.score_team1", 0] },
          scoreTeam2: { $ifNull: ["$match.score_team2", 0] },
          goalsDetails: { $ifNull: ["$match.goalsDetails", []] },
        },
      },
      {
        $group: {
          _id: "$matchId",
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]).toArray(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      {
        $match: {
          $expr: { $eq: ["$teamCompetition.team_id", "$competition.champion_team_id"] },
          "competition.type": { $in: ["league", "summer_cup", "cup", "supercup", "nations_cup"] },
        },
      },
      {
        $group: {
          _id: "$competition.type",
          competitions: { $addToSet: "$competition._id" },
        },
      },
    ]).toArray(),

    db.collection("playercompetitions").aggregate([
      { $match: { player_id: playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      {
        $match: {
          $expr: { $eq: ["$teamCompetition.team_id", "$competition.champion_team_id"] },
          "competition.type": { $in: ["league", "cup", "supercup", "nations_cup"] },
        },
      },
      {
        $project: {
          type: "$competition.type",
          seasonKey: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$competition.start_date",
            },
          },
        },
      },
      {
        $group: {
          _id: "$seasonKey",
          titles: { $addToSet: "$type" },
        },
      },
    ]).toArray(),

    db.collection("playermatchstats").aggregate([
      {
        $lookup: {
          from: "playercompetitions",
          localField: "player_competition_id",
          foreignField: "_id",
          as: "pc",
        },
      },
      { $match: { "pc.player_id": playerOid } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: "$teamCompetition" },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: "$competition" },
      {
        $lookup: {
          from: "matches",
          localField: "match_id",
          foreignField: "_id",
          as: "match",
        },
      },
      { $unwind: "$match" },
      {
        $project: {
          seasonKey: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$competition.start_date",
            },
          },
          matchId: "$match._id",
          matchDate: "$match.date",
          goals: { $ifNull: ["$goals", 0] },
          preassists: { $ifNull: ["$preassists", 0] },
        },
      },
      {
        $sort: {
          seasonKey: 1,
          matchDate: 1,
          matchId: 1,
        },
      },
    ]).toArray(),
  ])

  const allStarTitles = normalizedUserRoles.filter((role) => {
    const normalized = role.name.normalize("NFKC").toLowerCase()
    return normalized.includes("all stars") || normalized.includes("future stars") || normalized.includes("rising stars")
  }).length

  const matchBadgeTotals = (matchBadgeRows ?? []).reduce(
    (acc, row) => {
      const isTeam1 = String(row.teamCompetitionId) === String(row.team1CompetitionId)
      const isTeam2 = String(row.teamCompetitionId) === String(row.team2CompetitionId)
      if (!isTeam1 && !isTeam2) return acc

      const teamScore = isTeam1 ? Number(row.scoreTeam1 ?? 0) : Number(row.scoreTeam2 ?? 0)
      const opponentScore = isTeam1 ? Number(row.scoreTeam2 ?? 0) : Number(row.scoreTeam1 ?? 0)

      if (teamScore > opponentScore && teamScore - opponentScore >= 7) {
        acc.mercyWins += 1
      }

      let ownRunning = 0
      let opponentRunning = 0
      let wasTrailing = false

      const goalsDetails = Array.isArray(row.goalsDetails) ? [...row.goalsDetails] : []
      goalsDetails
        .sort((a, b) => Number(a?.minute ?? 0) - Number(b?.minute ?? 0))
        .forEach((goal) => {
          const byOwnTeam = String(goal?.team) === String(row.teamCompetitionId)
          if (byOwnTeam) ownRunning += 1
          else opponentRunning += 1
          if (ownRunning < opponentRunning) wasTrailing = true
        })

      if (wasTrailing && teamScore > opponentScore) {
        acc.comebackWins += 1
      }

      if (teamScore > opponentScore) {
        const goalsDetails = Array.isArray(row.goalsDetails) ? [...row.goalsDetails] : []
        const ownGoals = goalsDetails
          .filter((goal) => String(goal?.team) === String(row.teamCompetitionId))
          .sort((a, b) => Number(a?.minute ?? 0) - Number(b?.minute ?? 0))

        const winningGoal = ownGoals[opponentScore]
        if (
          winningGoal &&
          String(winningGoal?.scorer) === String(row.playerCompetitionId) &&
          [19, 20].includes(Number(winningGoal?.minute ?? -1))
        ) {
          acc.lateHeroWins += 1
        }
      }

      return acc
    },
    { mercyWins: 0, comebackWins: 0, lateHeroWins: 0 }
  )

  const titleTotals = (titleRows ?? []).reduce(
    (acc, row) => {
      const count = Array.isArray(row?.competitions) ? row.competitions.length : 0
      if (row?._id === "league") acc.leagueTitles = count
      if (row?._id === "summer_cup") acc.summerTitles = count
      if (row?._id === "cup") acc.cupTitles = count
      if (row?._id === "supercup") acc.supercupTitles = count
      if (row?._id === "nations_cup") acc.nationsTitles = count
      return acc
    },
    { leagueTitles: 0, summerTitles: 0, cupTitles: 0, supercupTitles: 0, nationsTitles: 0 }
  )

  const trebleSeasons = (titleSeasonRows ?? []).reduce((sum, row) => {
    const titles = new Set(Array.isArray(row?.titles) ? row.titles.map((item) => String(item)) : [])
    return titles.has("league") && titles.has("cup") && titles.has("supercup") ? sum + 1 : sum
  }, 0)

  const seasonMatchMap = new Map<string, Array<{ goals: number }>>()
  for (const row of seasonMatchRows ?? []) {
    const seasonKey = row?.seasonKey ? String(row.seasonKey) : ""
    const matchId = row?.matchId ? String(row.matchId) : ""
    if (!seasonKey || !matchId) continue
    const key = `${seasonKey}:${matchId}`
    if (!seasonMatchMap.has(key)) {
      seasonMatchMap.set(key, [])
    }
    seasonMatchMap.get(key)?.push({ goals: Number(row?.goals ?? 0) })
  }

  const seasonBuckets = new Map<string, number[]>()
  for (const [compositeKey, rows] of seasonMatchMap.entries()) {
    const seasonKey = compositeKey.split(":")[0]
    const totalGoals = rows.reduce((sum, row) => sum + row.goals, 0)
    const bucket = seasonBuckets.get(seasonKey) ?? []
    bucket.push(totalGoals)
    seasonBuckets.set(seasonKey, bucket)
  }

  const perfectStartSeasons = [...seasonBuckets.values()].reduce((sum, goalsByMatch) => {
    if (goalsByMatch.length < 3) return sum
    return goalsByMatch.slice(0, 3).every((goals) => goals > 0) ? sum + 1 : sum
  }, 0)

  const bestAwards = normalizedUserRoles.filter((role) => {
    const normalized = role.name.normalize("NFKC").toLowerCase()
    return normalized.includes("best gk") || normalized.includes("best defender") || normalized.includes("best midfielder") || normalized.includes("best attacker") || normalized.includes("best mvp")
  }).length

  const doubleCenturyCareer = Number((Number(statsRow?.goals ?? 0) > 100 && Number(statsRow?.assists ?? 0) > 100) ? 1 : 0)

  const stats: ProfileStats = {
    matchesPlayed: Number(statsRow?.matchesPlayed ?? 0),
    matchesWon:    Number(statsRow?.matchesWon    ?? 0),
    goals:         Number(statsRow?.goals         ?? 0),
    assists:       Number(statsRow?.assists       ?? 0),
    preassists:    Number(statsRow?.preassists    ?? 0),
    cleanSheets:   Number(statsRow?.cleanSheets   ?? 0),
    mvp:           Number(statsRow?.mvp           ?? 0),
    totw:          Number(statsRow?.totw          ?? 0),
    kicks:         Number(statsRow?.kicks         ?? 0),
    braces:        Number(multiGoalRow?.braces    ?? 0),
    hatTricks:     Number(multiGoalRow?.hatTricks ?? 0),
    pokers:        Number(multiGoalRow?.pokers    ?? 0),
    seasonsPlayed: Number(seasonsRow?.seasonsPlayed ?? 0),
    sameTeamSeasonsMax: Number(seasonsRow?.sameTeamSeasonsMax ?? 0),
    goalMinutesCovered: Number(goalMinutesRow?.goalMinutesCovered ?? 0),
    nationsParticipations: Number(nationsRow?.nationsParticipations ?? 0),
    teamsPlayed: Number(teamsRow?.teamsPlayed ?? 0),
    versatileCoverage: Number(versatileRow?.versatileCoverage ?? 0),
    doubleDoubleSeasons: Number(doubleDoubleRow?.doubleDoubleSeasons ?? 0),
    invincibleLeagues: Number(invincibleRow?.invincibleLeagues ?? 0),
    seasonInvictos: Number(seasonInvictosRow?.seasonInvictos ?? 0),
    captaincies: Number(captainRow?.captaincies ?? 0),
    impactSubMatches: Number(rookieBadgesRow?.impactSubMatches ?? 0),
    teamsOverFourMatches: Number(teamsRow?.teamsOverFourMatches ?? 0),
    fullShiftMatches: Number(rookieBadgesRow?.fullShiftMatches ?? 0),
    ownGoals: Number(statsRow?.ownGoals ?? 0),
    doubleThreatMatches: Number(rookieBadgesRow?.doubleThreatMatches ?? 0),
    allStarTitles,
    mercyWins: matchBadgeTotals.mercyWins,
    comebackWins: matchBadgeTotals.comebackWins,
    leagueTitles: titleTotals.leagueTitles,
    summerTitles: titleTotals.summerTitles,
    rookiePlaceholder: 0,
    openingStrikeGoals: Number(goalMinutesRow?.openingStrikeGoals ?? 0),
    cupTitles: titleTotals.cupTitles,
    supercupTitles: titleTotals.supercupTitles,
    silentGeniusMatches: Number(rookieBadgesRow?.silentGeniusMatches ?? 0),
    lateHeroWins: matchBadgeTotals.lateHeroWins,
    perfectStartSeasons,
    trebleSeasons,
    nationsTitles: titleTotals.nationsTitles,
    bigNightMatches: Number(rookieBadgesRow?.bigNightMatches ?? 0),
    bestAwards,
    doubleCenturyCareer,
    championPlaceholder: 0,
    fusionPlaceholder: 0,
  }

  return {
    user: { discordId: user.discordId, roles: normalizedUserRoles, playerId: playerObjectId },
    player: player
      ? { id: player._id.toString(), playerId: player.player_id, name: player.player_name, country: player.country, avatar: player.avatar }
      : null,
    stats,
    objectives: objectiveDefinitions.map((o) => {
      const current = stats[o.stat]
      const completed = current >= o.target

      if (o.key === "pokers-1") {
        return {
          ...o,
          label: "Poker Face",
          description: "Score a poker with 4+ goals in a single match.",
          current,
          completed,
        }
      }

      if (o.key === "comeback") {
        return {
          ...o,
          description: "Come back to win a match.",
          current,
          completed,
        }
      }

      return {
        ...o,
        current,
        completed,
      }
    }),
  }
}
