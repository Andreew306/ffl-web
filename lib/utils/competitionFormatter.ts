// lib/utils/competitionFormatter.ts
import { Document } from 'mongoose';
import { ICompetition } from '../models/Competition';

export function formatCompetition(competition: ICompetition & Document): any {
  const startDateStr = competition.start_date ? new Date(competition.start_date).toISOString().split('T')[0] : null;
  const endDateStr = competition.end_date ? new Date(competition.end_date).toISOString().split('T')[0] : null;

  const formatted = {
    id: competition.competition_id,
    name: generateCompetitionName(competition),
    type: translateType(competition.type),
    status: translateStatus(competition.status),
    startDate: startDateStr,
    endDate: endDateStr,
    image: competition.image || '/default-tournament.jpg',
    champion: competition.champion_team_id?.name
  };

  return formatted;
}

function generateCompetitionName(competition: ICompetition): string {
  if (competition.type === 'league') {
    return `Temporada ${competition.season_id} - ${getSeasonName(competition.start_date)} League`;
  }
  return competition.name || `Competition ${competition.competition_id}`;
}

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    upcoming: 'Próximo',
    active: 'Activo',
    finished: 'Finalizado'
  };
  return statusMap[status] || status;
}

function translateType(type: string): string {
  const typeMap: Record<string, string> = {
    league: 'Liga',
    cup: 'Copa',
    supercup: 'Supercopa',
    summer_cup: 'Summer Cup',
    nations_cup: 'Nations Cup',
    friendly: 'Amistoso'
  };
  return typeMap[type] || type;
}

function getSeasonName(date: string | undefined): string {
  if (!date) return '';
  const month = new Date(date).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Primavera';
  if (month >= 6 && month <= 8) return 'Verano';
  if (month >= 9 && month <= 11) return 'Otoño';
  return 'Invierno';
}
