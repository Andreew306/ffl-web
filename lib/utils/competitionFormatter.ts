// lib/utils/competitionFormatter.ts
import { Document } from "mongoose";

type CompetitionDoc = {
  competition_id?: string | number;
  name?: string;
  type: string;
  status: string;
  start_date?: string | Date;
  end_date?: string | Date;
  image?: string;
  season_id?: string | number;
  champion_team_id?: { name?: string };
  _id?: unknown;
};

export type FormattedCompetition = {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  image: string;
  champion?: string;
};

export function formatCompetition(competition: CompetitionDoc & Document): FormattedCompetition {
  const startDateStr = competition.start_date ? new Date(competition.start_date).toISOString().split("T")[0] : null;
  const endDateStr = competition.end_date ? new Date(competition.end_date).toISOString().split("T")[0] : null;

  return {
    id: String(competition.competition_id ?? competition._id),
    name: generateCompetitionName(competition),
    type: translateType(competition.type),
    status: translateStatus(competition.status),
    startDate: startDateStr,
    endDate: endDateStr,
    image: competition.image || "/default-tournament.jpg",
    champion: competition.champion_team_id?.name,
  };
}

function generateCompetitionName(competition: CompetitionDoc): string {
  if (competition.type === "league") {
    return `Season ${competition.season_id} - ${getSeasonName(competition.start_date)} League`;
  }
  return competition.name || `Competition ${competition.competition_id}`;
}

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    upcoming: "Próximo",
    active: "Active",
    finished: "Finished",
  };
  return statusMap[status] || status;
}

function translateType(type: string): string {
  const typeMap: Record<string, string> = {
    league: "League",
    cup: "Cup",
    supercup: "Supercup",
    summer_cup: "Summer Cup",
    nations_cup: "Nations Cup",
    friendly: "Friendly",
  };
  return typeMap[type] || type;
}

function getSeasonName(date: string | Date | undefined): string {
  if (!date) return "";
  const month = new Date(date).getMonth() + 1;
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Otoño";
  return "Winter";
}
