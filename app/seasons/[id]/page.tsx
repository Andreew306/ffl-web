import SeasonDetailPage from "./SeasonDetailPage";
import { getSeasonData, getCompetitionData } from "@/lib/services/season.service";

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seasonId: string = id;
  console.log("🟢 [SeasonPage] seasonId recibido:", seasonId);

  // Obtener todas las competiciones de la temporada
  const competitions = await getSeasonData(seasonId);
  if (!competitions?.length) return <div>No hay competiciones para esta temporada</div>;

  // Tomamos la primera competición
  const competitionId = competitions[0].competition_id;
  const competitionData = await getCompetitionData(competitionId);
  if (!competitionData) return <div>No se encontró la competición</div>;

  return <SeasonDetailPage season={JSON.parse(JSON.stringify(competitionData))} />;
}
