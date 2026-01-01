// services/season.service.ts
import connectDB from "../db/mongoose";
import CompetitionModel from "@/lib/models/Competition";
import TeamCompetitionModel from "@/lib/models/TeamCompetition";
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition";
import MatchModel from "@/lib/models/Match";

// Registrar Player y Team para asegurar populate
import "@/lib/models/Player";
import "@/lib/models/Team";



export async function getSeasonData(seasonId: string) {
    await connectDB();

    console.log("🔍 [getSeasonData] seasonId recibido:", seasonId);

    const seasonNumber = parseInt(seasonId.replace("season-", ""), 10);
    console.log("🔍 [getSeasonData] convertido a número:", seasonNumber);

    const competitions = await CompetitionModel.find({ season: seasonNumber }).lean();
    console.log("✅ [getSeasonData] competiciones encontradas:", competitions.length);

    return competitions;
}

export async function getCompetitionData(competitionId: string) {
    await connectDB();

    const competition = (await CompetitionModel.findOne({ competition_id: competitionId }).lean()) as { _id?: unknown } | null;
    if (!competition) return null;
    const competitionObjectId = competition._id;

    // Equipos
    const teams = await TeamCompetitionModel.find({ competition_id: competitionObjectId })
        .populate("team_id")
        .sort({ points: -1 })
        .lean();

    // Partidos
    const matches = await MatchModel.find({ competition_id: competitionObjectId })
        .sort({ date: 1 })
        .lean();

    // Mapear equipos para rellenar nombres y logos
    const teamCompetitions = (await TeamCompetitionModel.find({ competition_id: competitionObjectId })
        .populate("team_id")
        .lean()) as Array<{ _id?: { toString(): string }; team_id?: unknown }>;
    const teamMap = new Map(teamCompetitions.map(tc => [tc._id?.toString() || "", tc]));

    const matchesWithTeams = matches.map(match => {
        const t1 = teamMap.get(match.team1_competition_id.toString());
        const t2 = teamMap.get(match.team2_competition_id.toString());

        return {
            ...match,
            team1: t1?.team_id || null,
            team2: t2?.team_id || null,
        };
    });

    // 🔹 Estadísticas de jugadores
    const playerStats = await PlayerCompetitionModel.find({
        team_competition_id: { $in: teamCompetitions.map(tc => tc._id) },
    })
        .populate("player_id")
        .lean();

    // 🔹 Rankings top 7
    const topScorers = [...playerStats]
        .sort((a, b) => (b.goals || 0) - (a.goals || 0))
        .slice(0, 7);

    const topAssists = [...playerStats]
        .sort((a, b) => (b.assists || 0) - (a.assists || 0))
        .slice(0, 7);

    const topCS = [...playerStats]
        .filter(p => p.position === "GK") // solo porteros
        .sort((a, b) => (b.cs || 0) - (a.cs || 0))
        .slice(0, 7);


    return {
        competition,
        teams,
        matches: matchesWithTeams,
        statistics: {
            topScorers,
            topAssists,
            topCS,
        },
    };
}

