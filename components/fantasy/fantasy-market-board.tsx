"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowDownRight, ArrowUpRight, BadgeDollarSign, Clock3, Gavel, Sparkles, X } from "lucide-react"
import { placeFantasyBidAction } from "@/app/fantasy/actions"
import { getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"

type MarketEntry = {
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  teamName?: string
  teamImage?: string
  kitImage?: string
  kitTextColor?: string
  basePrice: number
  priceChangePercent?: number
  priceChangeDirection?: "up" | "down" | "flat"
  minBid: number
  highestBid: number | null
  sellerTeamName: string | null
  userBid: number | null
}

type FantasyMarketBoardProps = {
  leagueId: string
  listings: MarketEntry[]
}

const MADRID_TIMEZONE = "Europe/Madrid"

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })

  const value = formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+0"
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)

  if (!match) {
    return 0
  }

  const sign = match[1] === "-" ? -1 : 1
  const hours = Number.parseInt(match[2], 10)
  const minutes = Number.parseInt(match[3] ?? "0", 10)
  return sign * (hours * 60 + minutes)
}

function getMadridDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(date)
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
  }
}

function makeDateInTimeZone(
  timeZone: string,
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number }
) {
  const approxUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second))
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, approxUtc)
  return new Date(approxUtc.getTime() - offsetMinutes * 60_000)
}

function getNextMadridReset(now = new Date()) {
  const madrid = getMadridDateParts(now)
  const nextDayUtc = new Date(Date.UTC(madrid.year, madrid.month - 1, madrid.day) + 24 * 60 * 60 * 1000)

  return makeDateInTimeZone(MADRID_TIMEZONE, {
    year: nextDayUtc.getUTCFullYear(),
    month: nextDayUtc.getUTCMonth() + 1,
    day: nextDayUtc.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  })
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function FlagBadge({ country, className }: { country: string; className?: string }) {
  const baseStyle = getFlagBackgroundStyle(country)
  const overlayUrl = shouldOverlayFlag(country) ? getTwemojiUrl(country) : ""
  const backgroundImage = overlayUrl
    ? baseStyle.backgroundImage
      ? `url(${overlayUrl}), ${baseStyle.backgroundImage}`
      : `url(${overlayUrl})`
    : baseStyle.backgroundImage

  return (
    <span
      aria-label={country}
      className={className}
      style={{
        ...baseStyle,
        backgroundImage,
        backgroundPosition: overlayUrl ? `center, ${baseStyle.backgroundPosition || "center"}` : baseStyle.backgroundPosition,
        backgroundSize: overlayUrl ? `cover, ${baseStyle.backgroundSize || "cover"}` : baseStyle.backgroundSize,
        backgroundRepeat: overlayUrl ? `no-repeat, ${baseStyle.backgroundRepeat || "no-repeat"}` : baseStyle.backgroundRepeat,
      }}
    />
  )
}

function PlayerVisual({ listing }: { listing: MarketEntry }) {
  const avatarIsImage = isImageUrl(listing.avatar || "")

  return (
    <div className="relative">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-900/90 bg-slate-900/80 shadow-[0_14px_28px_rgba(2,6,23,0.45)]"
        style={
          listing.kitImage
            ? {
                backgroundImage: `url(${listing.kitImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {avatarIsImage ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-950/70 bg-slate-950/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.avatar} alt={listing.playerName} className="h-full w-full rounded-full object-cover" />
          </div>
        ) : null}
      </div>
      {listing.country ? (
        <FlagBadge
          country={listing.country}
          className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full ring-2 ring-slate-950"
        />
      ) : null}
      {listing.teamImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.teamImage}
          alt={listing.teamName || listing.playerName}
          className="absolute -bottom-1.5 -left-1.5 h-6 w-6 rounded-full border border-white/10 bg-slate-950 object-cover ring-2 ring-slate-950"
        />
      ) : null}
    </div>
  )
}

function PriceTrend({
  direction,
  percent,
}: {
  direction?: "up" | "down" | "flat"
  percent?: number
}) {
  if (!percent || direction === "flat" || !direction) {
    return null
  }

  const isUp = direction === "up"
  const Icon = isUp ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={
        isUp
          ? "inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-100"
          : "inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-[11px] font-medium text-rose-100"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {percent}%
    </span>
  )
}

function FflCoin({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.2),transparent_42%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
          : "rounded-[22px] border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.22),transparent_40%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.34)]"
      }
    >
      <div className={compact ? "relative h-6 w-6 rounded-full bg-slate-950/80 ring-1 ring-white/10" : "relative h-10 w-10 rounded-full bg-slate-950/80 ring-1 ring-white/10"}>
        <Image
          src="/ffl-logo2.png"
          alt="FFL Coin"
          fill
          sizes={compact ? "24px" : "40px"}
          className="object-contain invert"
        />
      </div>
      <div className={compact ? "leading-none" : ""}>
        {!compact ? <div className="text-[10px] uppercase tracking-[0.26em] text-cyan-100/70">FFL Coin</div> : null}
        <div className={compact ? "text-sm font-semibold text-white" : "mt-1 text-lg font-semibold text-white"}>{value}</div>
      </div>
    </div>
  )
}

function BidModal({
  leagueId,
  listing,
  onClose,
}: {
  leagueId: string
  listing: MarketEntry
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [amount, setAmount] = useState(String(Math.max(listing.basePrice, listing.userBid ?? listing.basePrice)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_40px_120px_rgba(2,6,23,0.65)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PlayerVisual listing={listing} />
            <div>
              <div className="text-xl font-semibold text-white">{listing.playerName}</div>
              <div className="mt-1 text-sm text-slate-400">
                Player #{listing.playerId}
              </div>
              {listing.teamName ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
                  {listing.teamImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.teamImage} alt={listing.teamName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full border border-white/10 bg-slate-800/80" />
                  )}
                  <span className="truncate text-sm text-slate-300">{listing.teamName}</span>
                </div>
              ) : null}
              <div className="mt-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-cyan-100">
                Private bid
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <FflCoin value={listing.basePrice} />
            <div className="mt-2">
              <PriceTrend direction={listing.priceChangeDirection} percent={listing.priceChangePercent} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Your bid</div>
            <div className="mt-1 text-lg font-semibold text-white">{listing.userBid ?? "-"}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="text-sm text-slate-300">
            Bids are private. Other managers cannot see your amount.
          </div>
          <div className="mt-4 relative">
            <BadgeDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="number"
              min={listing.basePrice}
              step={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-10 pr-4 text-white outline-none transition focus:border-cyan-300/40"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 font-medium text-slate-300 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setMessage(null)
                const result = await placeFantasyBidAction(leagueId, listing.playerObjectId, Number(amount))

                if (!result.ok) {
                  setMessage(result.error)
                  return
                }

                setMessage("Bid placed.")
                router.refresh()
                setTimeout(onClose, 400)
              })
            }
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Gavel className="h-4 w-4" />
            {pending ? "Bidding..." : "Place bid"}
          </button>
        </div>

        {message ? <div className="mt-3 text-sm text-slate-300">{message}</div> : null}
      </div>
    </div>
  )
}

function MarketCard({
  listing,
  onOpen,
}: {
  listing: MarketEntry
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-[26px] border border-white/10 bg-slate-950/50 p-4 text-left transition hover:border-cyan-300/20 hover:bg-slate-950/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <PlayerVisual listing={listing} />
          <div>
            <div className="text-lg font-semibold text-white transition group-hover:text-cyan-100">
              {listing.playerName}
            </div>
            <div className="mt-1 text-sm text-slate-400">Player #{listing.playerId}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FflCoin value={listing.basePrice} compact />
              <PriceTrend direction={listing.priceChangeDirection} percent={listing.priceChangePercent} />
              {listing.userBid ? (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
                  Your bid {listing.userBid}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className={listing.sellerTeamName
            ? "rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1 text-[9px] uppercase tracking-[0.28em] text-fuchsia-100"
            : "rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[9px] uppercase tracking-[0.28em] text-emerald-100"}
        >
          {listing.sellerTeamName ? listing.sellerTeamName : "League market"}
        </div>
      </div>
    </button>
  )
}

export default function FantasyMarketBoard({ leagueId, listings }: FantasyMarketBoardProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(getNextMadridReset().getTime() - Date.now()))

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.playerObjectId === selectedPlayerId) ?? null,
    [listings, selectedPlayerId]
  )

  useEffect(() => {
    const update = () => {
      setTimeLeft(formatCountdown(getNextMadridReset().getTime() - Date.now()))
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Daily market</div>
          <h2 className="mt-2 text-3xl font-semibold text-white">{listings.length} available players</h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-100">
            <Sparkles className="h-4 w-4" />
            Refreshed today
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-200">
            <Clock3 className="h-4 w-4 text-cyan-200" />
            Reset in {timeLeft}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <MarketCard key={listing.playerObjectId} listing={listing} onOpen={() => setSelectedPlayerId(listing.playerObjectId)} />
        ))}
      </div>

      {selectedListing ? (
        <BidModal leagueId={leagueId} listing={selectedListing} onClose={() => setSelectedPlayerId(null)} />
      ) : null}
    </div>
  )
}
