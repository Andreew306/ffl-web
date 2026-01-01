import dbConnect from "@/lib/db/mongoose"
import CompetitionModel from "@/lib/models/Competition"
import MatchModel from "@/lib/models/Match"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import Link from "next/link"

type CompetitionDoc = {
  _id?: { toString(): string }
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
  end_date?: Date | string
  image?: string
}

type TeamCompetitionDoc = {
  competition_id?: { toString(): string }
  team_id?: { toString(): string }
}

type MatchDoc = {
  competition_id?: { toString(): string }
}

type SeasonGroup = {
  key: string
  type: "season" | "summer_cup" | "nations_cup"
  title: string
  seasonNumber?: number
  competitions: CompetitionDoc[]
  startDate?: Date | null
  endDate?: Date | null
  image?: string
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
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return "Competition"
}

export default async function SeasonsPage() {
  await dbConnect()

  const competitions = await CompetitionModel.find({
    type: { $in: ["league", "cup", "supercup", "summer_cup", "nations_cup"] },
  }).lean<CompetitionDoc[]>()

  const competitionIds = competitions.map((item) => item._id).filter(Boolean)
  const teamCompetitions = competitionIds.length
    ? await TeamCompetitionModel.find({ competition_id: { $in: competitionIds } })
        .select("competition_id team_id")
        .lean<TeamCompetitionDoc[]>()
    : []
  const matches = competitionIds.length
    ? await MatchModel.find({ competition_id: { $in: competitionIds } })
        .select("competition_id")
        .lean<MatchDoc[]>()
    : []

  const teamCountByCompetition = teamCompetitions.reduce<Record<string, Set<string>>>((acc, row) => {
    const competitionId = row.competition_id?.toString()
    const teamId = row.team_id?.toString()
    if (!competitionId || !teamId) return acc
    if (!acc[competitionId]) acc[competitionId] = new Set()
    acc[competitionId].add(teamId)
    return acc
  }, {})

  const matchCountByCompetition = matches.reduce<Record<string, number>>((acc, row) => {
    const competitionId = row.competition_id?.toString()
    if (!competitionId) return acc
    acc[competitionId] = (acc[competitionId] || 0) + 1
    return acc
  }, {})

  const toSeasonNumber = (competition: CompetitionDoc) => {
    const raw = competition.season_id ?? competition.season
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  }
  const toDate = (value?: Date | string | null) => (value ? new Date(value) : null)

  const seasonGroups: Record<string, SeasonGroup> = {}

  competitions.forEach((competition) => {
    const type = competition.type
    if (type && ["league", "cup", "supercup"].includes(type)) {
      const seasonRaw = competition.season_id ?? competition.season ?? "unknown"
      const seasonKey = `season-${seasonRaw}`
      if (!seasonGroups[seasonKey]) {
        const seasonNumber = toSeasonNumber(competition) ?? undefined
        seasonGroups[seasonKey] = {
          key: seasonKey,
          type: "season",
          title: seasonNumber ? `Season ${seasonNumber}` : `Season ${seasonRaw}`,
          seasonNumber,
          competitions: [],
          startDate: null,
          endDate: null,
        }
      }
      const group = seasonGroups[seasonKey]
      group.competitions.push(competition)
      const start = toDate(competition.start_date)
      const end = toDate(competition.end_date)
      if (start && (!group.startDate || start < group.startDate)) group.startDate = start
      if (end && (!group.endDate || end > group.endDate)) group.endDate = end
      if (!group.image && competition.image) group.image = competition.image
    } else if (type === "summer_cup" || type === "nations_cup") {
      const key = `${type}-${competition._id?.toString()}`
      seasonGroups[key] = {
        key,
        type,
        title: formatCompetitionLabel(competition),
        competitions: [competition],
        startDate: toDate(competition.start_date),
        endDate: toDate(competition.end_date),
        image: competition.image,
      }
    }
  })

  const orderedCards = Object.values(seasonGroups).sort((a, b) => {
    const aTime = a.startDate ? a.startDate.getTime() : 0
    const bTime = b.startDate ? b.startDate.getTime() : 0
    return bTime - aTime
  })

  const getOptionLabel = (competition: CompetitionDoc) => {
    if (competition.type === "league") return `Div ${competition.division ?? "-"}`
    if (competition.type === "cup") return "Cup"
    if (competition.type === "supercup") return "Supercup"
    if (competition.type === "summer_cup") return "Summer Cup"
    if (competition.type === "nations_cup") return "Nations Cup"
    return "Competition"
  }
  const optionOrder = (competition: CompetitionDoc) => {
    if (competition.type === "league") return competition.division ?? 99
    if (competition.type === "cup") return 50
    if (competition.type === "supercup") return 60
    return 99
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-10 space-y-8">
        {orderedCards.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orderedCards.map((card) => {
              const startDate = card.startDate ? card.startDate.toLocaleDateString("en-GB") : "-"
              const endDate = card.endDate ? card.endDate.toLocaleDateString("en-GB") : "-"
              const cardImage = card.image || card.competitions?.[0]?.image || ""
              const sortedCompetitions = [...card.competitions].sort(
                (a, b) => optionOrder(a) - optionOrder(b)
              )
              return (
                <div
                  key={card.key}
                  className="rounded-2xl border border-teal-400/20 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-5 shadow-[0_0_30px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-300/70">
                        {card.type === "season"
                          ? "season"
                          : card.type.replace("_", " ")}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-white">{card.title}</h2>
                    </div>
                    {cardImage ? (
                      <img
                        src={cardImage}
                        alt={card.title}
                        className="h-12 w-12 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full border border-slate-800 bg-slate-900/60" />
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    {(() => {
                      const uniqueTeams = new Set<string>()
                      sortedCompetitions.forEach((item) => {
                        const compId = item._id?.toString()
                        const teamsSet = compId ? teamCountByCompetition[compId] : null
                        if (!teamsSet) return
                        teamsSet.forEach((teamId: string) => uniqueTeams.add(teamId))
                      })
                      const matchesTotal = sortedCompetitions.reduce((sum, item) => {
                        const compId = item._id?.toString()
                        return sum + (compId ? matchCountByCompetition[compId] || 0 : 0)
                      }, 0)
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Dates</span>
                            <span>
                              {startDate} - {endDate}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Teams</span>
                            <span>{uniqueTeams.size || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Matches</span>
                            <span>{matchesTotal || "-"}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-teal-100">
                    {sortedCompetitions.map((item) => (
                      <Link
                        key={item._id?.toString()}
                        href={`/competitions/${item._id?.toString()}`}
                        className="rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-400/20 hover:text-white hover:shadow-[0_6px_14px_rgba(20,184,166,0.25)]"
                      >
                        {getOptionLabel(item)}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
            No competitions found for seasons.
          </div>
        )}
      </div>
    </div>
  )
}
