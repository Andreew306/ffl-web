import { NextResponse } from "next/server"
import { getWordlePlayerForDate } from "@/lib/services/wordle.service"

function toMadridDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(value)

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0")

  if (hour < 1) {
    const previous = new Date(value.getTime() - 24 * 60 * 60 * 1000)
    const prevParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(previous)

    const prevYear = prevParts.find((part) => part.type === "year")?.value ?? "0000"
    const prevMonth = prevParts.find((part) => part.type === "month")?.value ?? "00"
    const prevDay = prevParts.find((part) => part.type === "day")?.value ?? "00"
    return `${prevYear}-${prevMonth}-${prevDay}`
  }

  return `${year}-${month}-${day}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateKey = searchParams.get("dateKey")
  if (!dateKey) {
    return NextResponse.json({ error: "Missing dateKey" }, { status: 400 })
  }

  const todayKey = toMadridDateKey()
  if (dateKey > todayKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const daily = await getWordlePlayerForDate(dateKey)
  return NextResponse.json({
    dateKey: daily.dateKey,
    answerDisplay: daily.answerDisplay,
    length: daily.length,
  })
}
