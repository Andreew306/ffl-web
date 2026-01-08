import dbConnect from "@/lib/db/mongoose"
import Player from "@/lib/models/Player"
import PlayerCompetition from "@/lib/models/PlayerCompetition"
import TeamCompetition from "@/lib/models/TeamCompetition"
import Competition from "@/lib/models/Competition"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Script from "next/script"
import {
  cn,
  getFlagBackgroundStyle,
  getKitTextColor,
  hashString,
  isImageUrl,
  shouldOverlayFlag,
  normalizeTeamImageUrl,
} from "@/lib/utils"
import mongoose from "mongoose"

export const revalidate = 60

const PAGE_SIZE = 30

const STAT_FIELDS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "kicks", label: "Kicks" },
  { value: "passes", label: "Passes" },
  { value: "passesForward", label: "Forward passes" },
  { value: "passesLateral", label: "Lateral passes" },
  { value: "passesBackward", label: "Backward passes" },
  { value: "keypass", label: "Key pass" },
  { value: "autopass", label: "Autopass" },
  { value: "misspass", label: "Missed passes" },
  { value: "shotsOnGoal", label: "Shots on goal" },
  { value: "shotsOffGoal", label: "Shots off goal" },
  { value: "saves", label: "Saves" },
  { value: "clearances", label: "Clearances" },
  { value: "recoveries", label: "Recoveries" },
  { value: "goalsConceded", label: "Goals conceded" },
  { value: "cs", label: "Clean sheets" },
  { value: "owngoals", label: "Own goals" },
  { value: "minutesPlayed", label: "Minutes played" },
  { value: "matchesPlayed", label: "Matches played" },
  { value: "matchesWon", label: "Matches won" },
  { value: "matchesDraw", label: "Matches drawn" },
  { value: "matchesLost", label: "Matches lost" },
]

type SearchParams = Record<string, string | string[] | undefined>
type KitDoc = { image?: string; color?: string }
type TeamCompetitionKitDoc = {
  _id?: { toString(): string }
  kits?: KitDoc[]
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

function readParam(params: SearchParams, key: string) {
  const raw = params?.[key]
  if (Array.isArray(raw)) return raw[0]
  return raw
}

function toObjectIdString(value: unknown) {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object") return ""
  const maybeWithId = value as { _id?: { toString?: () => string } }
  if (maybeWithId._id?.toString) return maybeWithId._id.toString()
  const maybeToString = value as { toString?: () => string }
  return maybeToString.toString ? maybeToString.toString() : ""
}

function pickDeterministicItem<T>(items: T[], seed: string) {
  if (!items.length) return null
  const index = hashString(seed) % items.length
  return items[index] || null
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

export default async function PlayersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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

  const competitions = (await Competition.find().sort({ start_date: -1 }).lean()) as Array<{
    _id: unknown
    type?: string
    season_id?: string | number
    season?: string | number
    division?: number
    start_date?: Date | string
    name?: string
    competition_id?: string
  }>

  const filter: Record<string, unknown> = {}
  if (q) filter.player_name = { $regex: q, $options: "i" }
  if (country !== "all") filter.country = country

  const isOnlyDivision = competition.startsWith("only_div_")
  const onlyDivision = isOnlyDivision ? Number.parseInt(competition.replace("only_div_", ""), 10) : null
  const isOnlyType = competition.startsWith("only_type_")
  const onlyType = isOnlyType ? competition.replace("only_type_", "") : ""

  if (competition !== "all" || filters.length > 0) {
    const pipeline: Record<string, unknown>[] = [{ $match: {} }]

    pipeline.push({
      $lookup: {
        from: "teamcompetitions",
        localField: "team_competition_id",
        foreignField: "_id",
        as: "tc",
      },
    })
    pipeline.push({ $unwind: "$tc" })

    if (competition !== "all") {
      if (isOnlyDivision && onlyDivision) {
        const ids = competitions
          .filter((c) => c.type === "league" && c.division === onlyDivision)
          .map((c) => c._id)
        if (ids.length > 0) pipeline.push({ $match: { "tc.competition_id": { $in: ids } } })
      } else if (isOnlyType && onlyType) {
        const ids = competitions.filter((c) => c.type === onlyType).map((c) => c._id)
        if (ids.length > 0) pipeline.push({ $match: { "tc.competition_id": { $in: ids } } })
      } else if (mongoose.Types.ObjectId.isValid(competition)) {
        pipeline.push({ $match: { "tc.competition_id": new mongoose.Types.ObjectId(competition) } })
      }
    }

    pipeline.push({
      $group: {
        _id: "$player_id",
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
        saves: { $sum: "$saves" },
        clearances: { $sum: "$clearances" },
        recoveries: { $sum: "$recoveries" },
        goalsConceded: { $sum: "$goalsConceded" },
        cs: { $sum: "$cs" },
        owngoals: { $sum: "$owngoals" },
        minutesPlayed: { $sum: "$minutesPlayed" },
        matchesPlayed: { $sum: "$matchesPlayed" },
        matchesWon: { $sum: "$matchesWon" },
        matchesDraw: { $sum: "$matchesDraw" },
        matchesLost: { $sum: "$matchesLost" },
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

    const ids = await PlayerCompetition.aggregate(
      pipeline as unknown as mongoose.PipelineStage[]
    )
    const playerIdsFromStats = ids.map((doc) => doc._id?.toString()).filter(Boolean)
    filter._id = { $in: playerIdsFromStats }
  }

  const [players, total, countries] = await Promise.all([
    Player.find(filter)
      .sort({ player_name: sort === "name_desc" ? -1 : 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Player.countDocuments(filter),
    Player.distinct("country"),
  ])

  const playerIds = players.map((player) => toObjectIdString(player._id)).filter(Boolean)
  const playerCompetitionRows = playerIds.length
    ? await PlayerCompetition.find({ player_id: { $in: playerIds } })
        .select("player_id team_competition_id")
        .lean()
    : []
  const teamCompetitionIds = Array.from(
    new Set(
      playerCompetitionRows
        .map((row) => toObjectIdString(row.team_competition_id))
        .filter(Boolean)
    )
  )
  const teamCompetitionRows = teamCompetitionIds.length
    ? await TeamCompetition.find({ _id: { $in: teamCompetitionIds } })
        .select("kits")
        .lean<TeamCompetitionKitDoc[]>()
    : []
  const teamCompetitionById = new Map<string, TeamCompetitionKitDoc>()
  teamCompetitionRows.forEach((row) => {
    const id = toObjectIdString(row._id)
    if (!id) return
    teamCompetitionById.set(id, row)
  })
  const playerKitOptions = new Map<string, { image: string; textColor: string }[]>()
  playerCompetitionRows.forEach((row) => {
    const playerId = toObjectIdString(row.player_id)
    const teamCompetitionId = toObjectIdString(row.team_competition_id)
    if (!playerId || !teamCompetitionId) return
    const teamCompetition = teamCompetitionById.get(teamCompetitionId)
    const kitOptions =
      teamCompetition?.kits
        ?.map((kit) => ({
          image: normalizeTeamImageUrl(kit?.image),
          textColor: getKitTextColor(kit?.color),
        }))
        .filter((kit) => Boolean(kit.image)) || []
    if (!kitOptions.length) return
    if (!playerKitOptions.has(playerId)) playerKitOptions.set(playerId, [])
    playerKitOptions.get(playerId)?.push(...kitOptions)
  })
  const playerFallbackKit = new Map<string, { image: string; textColor: string }>()
  const needsGlobalFallback = playerIds.some(
    (playerId) => !(playerKitOptions.get(playerId) || []).length
  )
  const allKitOptions = needsGlobalFallback
    ? (await TeamCompetition.find({})
        .select("kits")
        .lean<TeamCompetitionKitDoc[]>())
        .flatMap(
          (row) =>
            row.kits
              ?.map((kit) => ({
                image: normalizeTeamImageUrl(kit?.image),
                textColor: getKitTextColor(kit?.color),
              }))
              .filter((kit) => Boolean(kit.image)) || []
        )
    : []
  playerIds.forEach((playerId) => {
    const kitOptions = playerKitOptions.get(playerId) || []
    const picked = pickDeterministicItem(
      kitOptions.length ? kitOptions : allKitOptions,
      playerId
    )
    if (picked) playerFallbackKit.set(playerId, picked)
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (country !== "all") params.set("country", country)
    if (competition !== "all") params.set("competition", competition)
    uiRows.forEach((row, idx) => {
      if (!row.field || row.value === "") return
      const n = idx + 1
      params.set(`stat${n}`, row.field)
      params.set(`op${n}`, row.op)
      params.set(`val${n}`, row.value)
    })
    if (sort !== "name_asc") params.set("sort", sort)
    params.set("page", String(targetPage))
    return `/players?${params.toString()}`
  }

  const filterScript = `
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
  `

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="pt-0 pb-16">
        <div className="container mx-auto px-4 space-y-8">
          <form
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-teal-900/10"
            action="/players"
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
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-2"
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
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-2"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
            <select
              name="competition"
              defaultValue={competition}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none lg:col-span-2"
            >
              <option value="all">All competitions</option>
              <option value="only_div_1">Only 1 division</option>
              <option value="only_div_2">Only 2 division</option>
              <option value="only_div_3">Only 3 division</option>
              <option value="only_type_cup">Only cup</option>
              <option value="only_type_supercup">Only supercup</option>
              <option value="only_type_summer_cup">Only summer cup</option>
              <option value="only_type_nations_cup">Only nations cup</option>
              {competitions.map((c) => (
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
                    <option value="">Stat</option>
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
                id="add-filter"
                className="bg-slate-800 border border-slate-700 text-sm text-gray-200 hover:border-teal-400"
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
                  href="/players"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 px-4 py-3 text-sm text-gray-300 hover:border-teal-400"
                >
                  Clear
                </Link>
              </div>
            </div>
          </form>

          {!players.length ? (
            <div className="text-center text-gray-400 border border-dashed border-gray-800 rounded-2xl p-10">
              No players found for this selection.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => {
                const playerId = toObjectIdString(player._id)
                const kitImage = playerId ? playerFallbackKit.get(playerId)?.image || "" : ""
                const kitTextColor =
                  playerId ? playerFallbackKit.get(playerId)?.textColor || "" : ""
                const avatar = player.avatar || ""
                const avatarIsImage = isImageUrl(avatar)
                return (
                  <Card
                    key={player._id?.toString() ?? player.player_id}
                    className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/60 border border-slate-800/70 hover:border-teal-400/60 transition-all shadow-md shadow-teal-900/20"
                  >
                  <CardContent className="p-6 space-y-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        {kitImage ? (
                          <div className="relative h-24 w-24 rounded-full overflow-hidden border border-slate-700 shadow-lg shadow-teal-900/50">
                            <img
                              src={kitImage}
                              alt={player.player_name}
                              className="h-full w-full object-cover"
                            />
                            {avatar ? (
                              avatarIsImage ? (
                                <img
                                  src={avatar}
                                  alt={player.player_name}
                                  className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full object-contain bg-transparent"
                                />
                              ) : (
                                <div
                                  className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent flex items-center justify-center text-5xl font-semibold"
                                  style={{ color: kitTextColor || "#ffffff" }}
                                >
                                  {avatar}
                                </div>
                              )
                            ) : null}
                          </div>
                        ) : avatarIsImage ? (
                          <img
                            src={avatar}
                            alt={player.player_name}
                            className="h-24 w-24 rounded-full object-cover ring-2 ring-teal-500/60 shadow-lg shadow-teal-900/50"
                          />
                        ) : avatar ? (
                          <div
                            className="h-24 w-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-semibold"
                            style={{ color: kitTextColor || "#ffffff" }}
                          >
                            {avatar}
                          </div>
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm text-gray-400">
                            No photo
                          </div>
                        )}
                        {player.country ? (() => {
                          const baseStyle = getFlagBackgroundStyle(player.country)
                          const overlayUrl = shouldOverlayFlag(player.country)
                            ? getTwemojiUrl(player.country)
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
                              aria-label={player.country}
                              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full ring-2 ring-slate-900"
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
                      <div className="pt-3 pb-2">
                        <h3 className="text-xl font-semibold">{player.player_name}</h3>
                      </div>
                    </div>

                    <Link href={`/players/${player.player_id}`}>
                      <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white">View profile</Button>
                    </Link>
                  </CardContent>
                  </Card>
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
              Page {clampedPage} of {totalPages} | {total} players
            </span>
            <Link
              href={buildHref(Math.min(totalPages, clampedPage + 1))}
              className={cn(
                "rounded-full border px-3 py-2",
                clampedPage === totalPages ? "pointer-events-none opacity-40" : "hover-border-teal-500/40"
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
            <option value="">Stat</option>
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
        {filterScript}
      </Script>
    </div>
  )
}
