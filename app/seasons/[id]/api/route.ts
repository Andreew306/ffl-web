import dbConnect from '@/lib/db/mongoose'
import Competition from '@/lib/models/Competition'
import TeamCompetition from '@/lib/models/TeamCompetition'
import MatchModel from '@/lib/models/Match'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const competitionId = params.id

    // 1️⃣ Equipos
    const teams = await TeamCompetition.find({ competition_id: competitionId }).lean()

    // 2️⃣ Clasificación
    const standings = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0))

    // 3️⃣ Partidos
    const matches = await MatchModel.find({ competition_id: competitionId }).lean()

    return new Response(
      JSON.stringify({
        competitionId,
        teams,
        standings,
        matches,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Error fetching season data' }), { status: 500 })
  }
}
