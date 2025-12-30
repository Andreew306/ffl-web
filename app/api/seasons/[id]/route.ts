import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Competition from "@/lib/models/Competition";
import TeamCompetitionModel from "@/lib/models/TeamCompetition";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const highlight = searchParams.get("highlight");

  await dbConnect();

  const competition = await Competition.findById(id).lean();
  if (!competition) {
    return NextResponse.json({ error: "Competición no encontrada" }, { status: 404 });
  }

  const teams = await TeamCompetitionModel.find({ competition_id: id })
    .populate({ path: "team_id", select: "name logo" })
    .lean();

  const matches = await MatchModel.find({ competition_id: id })
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id", select: "name logo" },
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id", select: "name logo" },
    })
    .lean();

  const matchStats = await TeamMatchStatsModel.find({
    match_id: { $in: matches.map((m) => m._id) },
  })
    .populate({
      path: "team_competition_id",
      populate: { path: "team_id", select: "name logo" },
    })
    .lean();

  const statsByMatch = matches.map((match) => ({
    ...match,
    stats: matchStats.filter((s) => String(s.match_id) === String(match._id)),
  }));

  const response = {
    ...competition,
    highlight,
    teams,
    matches: statsByMatch,
  };

  return NextResponse.json(response, { status: 200 });
}
