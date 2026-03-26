import { NextResponse } from "next/server"
import { getWordlePlayerForDate } from "@/lib/services/wordle.service"

function toMadridDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
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
