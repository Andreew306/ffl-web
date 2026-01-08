import dbConnect from "@/lib/db/mongoose"
import Team from "@/lib/models/Team"
import TeamCompetition from "@/lib/models/TeamCompetition"
import Competition from "@/lib/models/Competition"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn, getFlagBackgroundStyle, normalizeTeamImageUrl, shouldOverlayFlag } from "@/lib/utils"
import mongoose from "mongoose"
import Script from "next/script"

export const revalidate = 60

const PAGE_SIZE = 30
const STAT_FIELDS = [
  { value: "matchesPlayed", label: "Matches played" },
  { value: "matchesWon", label: "Matches won" },
  { value: "matchesDraw", label: "Matches drawn" },
  { value: "matchesLost", label: "Matches lost" },
  { value: "goalsScored", label: "Goals scored" },
  { value: "goalsConceded", label: "Goals conceded" },
  { value: "points", label: "Points" },
  { value: "possessionAvg", label: "Average possession" },
  { value: "kicks", label: "Kicks" },
  { value: "passes", label: "Passes" },
  { value: "shotsOnGoal", label: "Shots on goal" },
  { value: "shotsOffGoal", label: "Shots off goal" },
  { value: "saves", label: "Saves" },
  { value: "cs", label: "Clean sheets" },
]

type SearchParams = Record<string, string | string[] | undefined>

function readParam(params: SearchParams, key: string) {
  const raw = params?.[key]
  if (Array.isArray(raw)) return raw[0]
  return raw
}

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function isoToFlag(code?: string) {
  if (!code || code.length !== 2) return ""
  const chars = code.toUpperCase().split("")
  const codePoints = chars.map((c) => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

function formatCompetitionLabel(competition: {
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
  name?: string
  competition_id?: string
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

  return competition.name || competition.competition_id || "Competition"
}

export default async function TeamsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams
  const page = Math.max(1, Number.parseInt(readParam(resolvedSearchParams, "page") || "1", 10) || 1)
  const q = readParam(resolvedSearchParams, "q")?.trim() || ""
  const country = readParam(resolvedSearchParams, "country")?.trim() || "all"
  const sortRaw = readParam(resolvedSearchParams, "sort") || "name_asc"
  const sort = ["name_asc", "name_desc"].includes(sortRaw) ? sortRaw : "name_asc"
  const competition = readParam(resolvedSearchParams, "competition")?.trim() || "all"

  const uiRows: { field: string; op: "gte" | "lte" | "eq"; value: string }[] = []
  {
    const indexSet = new Set<number>()
    Object.keys(resolvedSearchParams || {}).forEach((key) => {
      const match = key.match(/^(stat|op|val)(\d+)$/)
      if (match?.[2]) indexSet.add(Number.parseInt(match[2], 10))
    })
    const sortedIndexes = Array.from(indexSet).sort((a, b) => a - b)
    sortedIndexes.forEach((idx) => {
      const field = readParam(resolvedSearchParams, `stat${idx}`)?.trim() || ""
      const opRaw = readParam(resolvedSearchParams, `op${idx}`) || ""
      const value = readParam(resolvedSearchParams, `val${idx}`)?.trim() || ""
      if (!field && !opRaw && !value) return
      const op: "gte" | "lte" | "eq" = opRaw === "lte" || opRaw === "eq" ? opRaw : "gte"
      uiRows.push({ field, op, value })
    })
  }

  const filters: { field: string; op: "gte" | "lte" | "eq"; value: number }[] = []
  uiRows.forEach((row) => {
    if (!row.field || row.value === "") return
    const numVal = Number.parseFloat(row.value)
    if (Number.isNaN(numVal)) return
    filters.push({ field: row.field, op: row.op, value: numVal })
  })
  await dbConnect()

  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [{ team_name: { $regex: q, $options: "i" } }, { teamName: { $regex: q, $options: "i" } }]
  }
  if (country !== "all") filter.country = country
  if (competition !== "all" || filters.length > 0) {
    const pipeline: Record<string, unknown>[] = [{ $match: {} }]
    if (competition !== "all") {
      if (mongoose.Types.ObjectId.isValid(competition)) {
        pipeline.push({
          $match: { competition_id: new mongoose.Types.ObjectId(competition) },
        })
      } else if (competition.startsWith("only_")) {
        pipeline.push({
          $lookup: {
            from: "competitions",
            localField: "competition_id",
            foreignField: "_id",
            as: "competition",
          },
        })
        pipeline.push({ $unwind: { path: "$competition", preserveNullAndEmptyArrays: false } })
        if (competition === "only_div1" || competition === "only_div2" || competition === "only_div3") {
          const division = Number(competition.replace("only_div", ""))
          pipeline.push({
            $match: { "competition.type": "league", "competition.division": division },
          })
        } else if (competition === "only_cup") {
          pipeline.push({ $match: { "competition.type": "cup" } })
        } else if (competition === "only_supercup") {
          pipeline.push({ $match: { "competition.type": "supercup" } })
        } else if (competition === "only_summer_cup") {
          pipeline.push({ $match: { "competition.type": "summer_cup" } })
        } else if (competition === "only_nations_cup") {
          pipeline.push({ $match: { "competition.type": "nations_cup" } })
        }
      }
    }

    pipeline.push({
      $group: {
        _id: "$team_id",
        matchesPlayed: { $sum: "$matchesPlayed" },
        matchesWon: { $sum: "$matchesWon" },
        matchesDraw: { $sum: "$matchesDraw" },
        matchesLost: { $sum: "$matchesLost" },
        goalsScored: { $sum: "$goalsScored" },
        goalsConceded: { $sum: "$goalsConceded" },
        points: { $sum: "$points" },
        possessionAvg: { $avg: "$possessionAvg" },
        kicks: { $sum: "$kicks" },
        passes: { $sum: "$passes" },
        shotsOnGoal: { $sum: "$shotsOnGoal" },
        shotsOffGoal: { $sum: "$shotsOffGoal" },
        saves: { $sum: "$saves" },
        cs: { $sum: "$cs" },
      },
    })

    if (filters.length > 0) {
      const matchAgg: Record<string, Record<string, number>> = {}
      filters.forEach((f) => {
        if (!matchAgg[f.field]) matchAgg[f.field] = {}
        if (f.op === "eq") {
          matchAgg[f.field]["$eq"] = f.value
        } else {
          matchAgg[f.field][`$${f.op}`] = f.value
        }
      })
      pipeline.push({ $match: matchAgg })
    }

    pipeline.push({ $project: { _id: 1 } })
    const ids = await TeamCompetition.aggregate(
      pipeline as unknown as mongoose.PipelineStage[]
    )
    const teamIdsFromStats = ids.map((doc) => doc._id?.toString()).filter(Boolean)
    filter._id = { $in: teamIdsFromStats }
  }

  const [teams, total, countries, competitions] = await Promise.all([
    Team.find(filter)
      .sort({ teamName: sort === "name_desc" ? -1 : 1, team_name: sort === "name_desc" ? -1 : 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Team.countDocuments(filter),
    Team.distinct("country"),
    Competition.find().sort({ start_date: -1 }).lean(),
  ])
  const typedCompetitions = competitions as Array<{
    _id: unknown
    type?: string
    season_id?: string | number
    season?: string | number
    division?: number
    start_date?: Date | string
    name?: string
    competition_id?: string
  }>
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (country !== "all") params.set("country", country)
    if (competition !== "all") params.set("competition", competition)
    if (sort !== "name_asc") params.set("sort", sort)
    params.set("page", String(targetPage))
    return `/teams?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="pt-0 pb-16">
        <div className="container mx-auto px-4 space-y-6">
          <form
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-teal-900/10"
            action="/teams"
            method="get"
          >
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-3"
            />
            <select
              name="country"
              defaultValue={country}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-3"
            >
              <option value="all">All nationalities</option>
              {countries
                .filter(Boolean)
                .sort()
                .map((c) => {
                  const label = typeof c === "string" ? c.toUpperCase() : String(c)
                  const flag = isoToFlag(label)
                  return (
                    <option key={label} value={label}>
                      {flag ? `${flag} ${label}` : label}
                    </option>
                  )
                })}
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-3"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
            <select
              name="competition"
              defaultValue={competition}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-3"
            >
              <option value="all">All competitions</option>
              <option value="only_div1">Only 1 division</option>
              <option value="only_div2">Only 2 division</option>
              <option value="only_div3">Only 3 division</option>
              <option value="only_cup">Only cup</option>
              <option value="only_supercup">Only supercup</option>
              <option value="only_summer_cup">Only summer cup</option>
              <option value="only_nations_cup">Only nations cup</option>
              {typedCompetitions.map((c) => (
                <option key={String(c._id)} value={String(c._id)}>
                  {formatCompetitionLabel(c)}
                </option>
              ))}
            </select>

            <div
              id="filter-rows"
              data-next-index={uiRows.length ? Math.max(...uiRows.map((_, i) => i + 1)) : 0}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:col-span-12"
            >
              {uiRows.map((row, idx) => (
                <div
                  key={`filter-row-${idx + 1}`}
                  className="filter-row col-span-1 lg:col-span-12 grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-3 sm:gap-4 items-start"
                >
                  <select
                    name={`stat${idx + 1}`}
                    defaultValue={row.field}
                    className="w-full min-w-[140px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Field</option>
                    {STAT_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <select
                    name={`op${idx + 1}`}
                    defaultValue={row.op}
                    className="w-full min-w-[90px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 text-sm text-center focus:border-teal-500 focus:outline-none"
                  >
                    <option value="gte">{">="}</option>
                    <option value="lte">{"<="}</option>
                    <option value="eq">{"="}</option>
                  </select>
                  <input
                    type="number"
                    name={`val${idx + 1}`}
                    defaultValue={row.value}
                    min={0}
                    placeholder="Value"
                    className="w-full min-w-[120px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 text-sm focus:border-teal-500 focus:outline-none"
                  />
                  <Button
                    type="button"
                    data-remove-filter
                    variant="outline"
                    className="h-full min-h-[48px] w-full sm:w-auto bg-slate-800 border border-slate-700 text-sm text-gray-200 hover:border-red-400 hover:text-red-200"
                  >
                    -
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 lg:col-span-12">
              <Button
                type="button"
                className="bg-slate-800 border border-slate-700 text-sm text-gray-200 hover:border-teal-400"
                id="add-filter"
              >
                + Add filter
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  type="submit"
                  className="h-11 bg-teal-600 hover:bg-teal-500 text-white px-4 py-3 text-sm"
                >
                  Apply filters
                </Button>
                <Link
                  href="/teams"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 px-4 py-3 text-sm text-gray-300 hover:border-teal-400"
                >
                  Clear
                </Link>
              </div>
            </div>
          </form>

          {!teams.length ? (
            <div className="text-center text-gray-400 border border-dashed border-gray-800 rounded-2xl p-10">
              No teams available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => {
                const teamImage = normalizeTeamImageUrl(team.image)
                return (
                  <Link
                    key={team._id?.toString() ?? team.team_id}
                    href={`/teams/${team.team_id}`}
                    className="group rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/60 p-6 shadow-md shadow-teal-900/20 transition hover:border-teal-400/60"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        {teamImage ? (
                          <img
                            src={teamImage}
                            alt={team.teamName || team.team_name || "Team"}
                            className="h-24 w-24 object-contain"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm text-gray-400">
                            No logo
                          </div>
                        )}
                        {team.country ? (() => {
                          const baseStyle = getFlagBackgroundStyle(team.country)
                          const overlayUrl = shouldOverlayFlag(team.country)
                            ? getTwemojiUrl(team.country)
                            : ""
                          const backgroundImage = overlayUrl
                            ? baseStyle.backgroundImage
                              ? `url(${overlayUrl}), ${baseStyle.backgroundImage}`
                              : `url(${overlayUrl})`
                            : baseStyle.backgroundImage
                          const baseSize = baseStyle.backgroundSize || "cover"
                          const basePosition = baseStyle.backgroundPosition || "center"
                          const baseRepeat = baseStyle.backgroundRepeat || "no-repeat"
                          return (
                            <span
                              aria-label={team.country}
                              className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full ring-2 ring-slate-900"
                              style={{
                                ...baseStyle,
                                backgroundImage,
                                backgroundPosition: overlayUrl
                                  ? `center, ${basePosition}`
                                  : basePosition,
                                backgroundSize: overlayUrl
                                  ? `cover, ${baseSize}`
                                  : baseSize,
                                backgroundRepeat: overlayUrl
                                  ? `no-repeat, ${baseRepeat}`
                                  : baseRepeat,
                              }}
                            />
                          )
                        })() : null}
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">
                          {team.teamName || team.team_name || "Team"}
                        </h2>
                      </div>
                      <span className="text-sm text-teal-200/80 group-hover:text-teal-200">
                        View team
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <Link
              href={buildHref(Math.max(1, clampedPage - 1))}
              className={cn(
                "rounded-full border px-3 py-2",
                clampedPage === 1 ? "pointer-events-none opacity-40" : "hover:border-teal-500/40"
              )}
            >
              Previous
            </Link>
            <span>
              Page {clampedPage} of {totalPages} | Total {total}
            </span>
            <Link
              href={buildHref(Math.min(totalPages, clampedPage + 1))}
              className={cn(
                "rounded-full border px-3 py-2",
                clampedPage === totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover-border-teal-500/40"
              )}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
      <div id="filter-row-template" className="hidden">
        <div className="filter-row col-span-1 lg:col-span-12 grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-3 sm:gap-4 items-start">
          <select
            data-name="stat"
            className="w-full min-w-[140px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="">Field</option>
            {STAT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          <select
            data-name="op"
            className="w-full min-w-[90px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 text-sm text-center focus:border-teal-500 focus:outline-none"
          >
            <option value="gte">{">="}</option>
            <option value="lte">{"<="}</option>
            <option value="eq">{"="}</option>
          </select>
          <input
            type="number"
            data-name="val"
            data-clear
            min={0}
            placeholder="Value"
            className="w-full min-w-[120px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 text-sm focus:border-teal-500 focus:outline-none"
          />
          <Button
            type="button"
            data-remove-filter
            variant="outline"
            className="h-full min-h-[48px] w-full sm:w-auto bg-slate-800 border border-slate-700 text-sm text-gray-200 hover:border-red-400 hover:text-red-200"
          >
            -
          </Button>
        </div>
      </div>
      <Script id="filters-script" strategy="afterInteractive">
        {`
          (function() {
            const addBtn = document.getElementById('add-filter');
            const container = document.getElementById('filter-rows');
            if (!addBtn || !container) return;
            let nextIndex = Number(container.dataset.nextIndex || '0');
            const removeRow = (el) => {
              const row = el.closest('.filter-row');
              if (row) row.remove();
            };
            const addFilter = () => {
              const templateRow = document.querySelector('#filter-row-template .filter-row');
              if (!templateRow) return;
              nextIndex += 1;
              const clone = templateRow.cloneNode(true);
              clone.querySelectorAll('[data-name]').forEach((el) => {
                const base = el.getAttribute('data-name');
                if (!base) return;
                el.name = base + nextIndex;
              });
              clone.querySelectorAll('[data-clear]').forEach((el) => {
                el.value = '';
              });
              clone.querySelectorAll('[data-remove-filter]').forEach((el) => {
                el.addEventListener('click', (e) => {
                  e.preventDefault();
                  removeRow(el);
                });
              });
              container.appendChild(clone);
              container.dataset.nextIndex = String(nextIndex);
            };
            addBtn.addEventListener('click', addFilter);
            container.addEventListener('click', (event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) return;
              const btn = target.closest('[data-remove-filter]');
              if (btn && container.contains(btn)) {
                event.preventDefault();
                removeRow(btn);
              }
            });
          })();
        `}
      </Script>
    </div>
  )
}
