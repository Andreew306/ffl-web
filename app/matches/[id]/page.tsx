// app/matches/[id]/page.tsx
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMatchData } from "@/lib/services/match.service";

// Barra comparativa corregida (cyan izquierda, blanco derecha)
function StatBar({ value1, value2 }: { value1: number; value2: number }) {
  const total = value1 + value2 || 1;
  const width1 = (value1 / total) * 100;
  const width2 = (value2 / total) * 100;
  return (
    <div className="flex h-4 w-full rounded overflow-hidden my-1 bg-gray-700">
      <div className="bg-cyan-500" style={{ width: `${width1}%` }} />
      <div className="bg-white" style={{ width: `${width2}%` }} />
    </div>
  );
}

// Definición de formaciones y coordenadas
export const formationCoordinates: Record<string, Record<string, { x: number; y: number }>> = {
  "1-2-1-3": {
    GK: { x: 5, y: 50 },
    CB1: { x: 25, y: 35 },
    CB2: { x: 25, y: 65 },
    CM: { x: 50, y: 50 },
    LW: { x: 75, y: 25 },
    RW: { x: 75, y: 75 },
    ST: { x: 90, y: 50 },
  },
  "1-3-1-2": {
    GK: { x: 5, y: 50 },
    LB: { x: 25, y: 20 },
    CB: { x: 25, y: 50 },
    RB: { x: 25, y: 80 },
    CM: { x: 50, y: 50 },
    ST1: { x: 80, y: 40 },
    ST2: { x: 80, y: 60 },
  },
  "1-2-2-2": {
    GK: { x: 5, y: 50 },
    CB1: { x: 25, y: 35 },
    CB2: { x: 25, y: 65 },
    CM1: { x: 55, y: 35 },
    CM2: { x: 55, y: 65 },
    ST1: { x: 85, y: 40 },
    ST2: { x: 85, y: 60 },
  },
  "1-1-2-3": { // nueva formación poco común
    GK: { x: 5, y: 50 },
    CB: { x: 25, y: 50 },
    CM1: { x: 50, y: 35 },
    CM2: { x: 50, y: 65 },
    LW: { x: 75, y: 25 },
    RW: { x: 75, y: 75 },
    ST: { x: 90, y: 50 },
  },
};

// Detecta la formación en base a los jugadores
function detectFormation(players: any[]): string {
  const positions = players.map(p => p.position).sort();
  for (const [formation, roles] of Object.entries(formationCoordinates)) {
    const expected = Object.keys(roles).sort();
    if (JSON.stringify(positions) === JSON.stringify(expected)) {
      return formation;
    }
  }
  return "1-2-1-3"; // fallback
}

// Ajusta posición de jugadores dinámicamente si la línea no está completa
function getPlayerPosition(position: string, formation: string, index: number, totalInLine: number) {
  const formationMap = formationCoordinates[formation];
  if (!formationMap[position]) return { x: 50, y: 50 }; // fallback

  const linePositions = Object.keys(formationMap).filter(p => p.startsWith(position));
  const yStart = 20;
  const yEnd = 80;
  if (totalInLine <= 1) return formationMap[position];

  const step = (yEnd - yStart) / (totalInLine - 1);
  return {
    x: formationMap[position].x,
    y: yStart + index * step
  };
}

// Agrupa jugadores por posición
const groupByPosition = (players: any[]) => {
  return players.reduce((acc: Record<string, any[]>, player) => {
    if (!acc[player.position]) acc[player.position] = [];
    acc[player.position].push(player);
    return acc;
  }, {});
};

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const data = await getMatchData(id);
  if (!data) return <p className="text-white p-4">Partido no encontrado</p>;

  const { match, teamStats, playerStats } = data;

  const team1Players = playerStats.filter(
    (p) => String(p.team_competition_id) === String(match.team1_competition_id?._id)
  );
  const team2Players = playerStats.filter(
    (p) => String(p.team_competition_id) === String(match.team2_competition_id?._id)
  );

  const team1Formation = detectFormation(team1Players);
  const team2Formation = detectFormation(team2Players);

  const team1Grouped = groupByPosition(team1Players);
  const team2Grouped = groupByPosition(team2Players);

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      {/* Header */}
      <section className="text-center mb-8">
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <Image
              src={match.team1_competition_id?.team_id?.image || "/placeholder.svg"}
              alt={match.team1_competition_id?.team_id?.teamName || "Team 1"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-2xl font-bold">
              {match.team1_competition_id?.team_id?.teamName || "Team 1"}
            </span>
          </div>
          <span className="text-2xl font-bold">vs</span>
          <div className="flex items-center gap-2">
            <Image
              src={match.team2_competition_id?.team_id?.image || "/placeholder.svg"}
              alt={match.team2_competition_id?.team_id?.teamName || "Team 2"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-2xl font-bold">
              {match.team2_competition_id?.team_id?.teamName || "Team 2"}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="mt-2">
          {match.date ? new Date(match.date).toLocaleDateString() : "-"}
        </Badge>
        <div className="text-2xl mt-2 font-bold">
          {match.score_team1 ?? 0} - {match.score_team2 ?? 0}
        </div>
      </section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 bg-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600">Resumen</TabsTrigger>
          <TabsTrigger value="playerStats" className="data-[state=active]:bg-yellow-600">Jugadores</TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="overview">
          <Card className="bg-slate-800 mb-4 p-4">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">Resumen del Partido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <h3 className="text-xl font-semibold text-center mb-2">STATS</h3>
              {["possession", "kicks", "passes", "shotsOnGoal"].map((statKey) => {
                const value1 = teamStats[0]?.[statKey] ?? 0;
                const value2 = teamStats[1]?.[statKey] ?? 0;
                const display1 = statKey === "possession" ? (value1 / 10).toFixed(1) + "%" : value1;
                const display2 = statKey === "possession" ? (value2 / 10).toFixed(1) + "%" : value2;
                return (
                  <div key={statKey} className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{display1}</span>
                      <span className="font-semibold">{statKey.toUpperCase().replace(/([A-Z])/g, " $1")}</span>
                      <span>{display2}</span>
                    </div>
                    <StatBar value1={value1} value2={value2} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jugadores */}
        <TabsContent value="playerStats">
          <div className="relative w-full h-[500px] rounded-lg overflow-hidden border-2 border-gray-400 bg-[#2a2a2a]">
            {/* Líneas del campo */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border border-white" />
              <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white" />
              <div className="absolute left-1/2 top-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-40 border-2 border-white" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-40 border-2 border-white" />
            </div>

            {/* Logo centro */}
            <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 opacity-80">
              <Image src="/ffl-logo.png" alt="FFL Logo" fill className="object-contain" />
            </div>

            {/* Jugadores equipo 1 (cyan, atacan derecha) */}
            {Object.entries(team1Grouped).map(([pos, playersInPos]) =>
              playersInPos.map((player, idx) => {
                const posCoords = getPlayerPosition(pos, team1Formation, idx, playersInPos.length);
                const initials = player.player_competition_id?.player_id?.playerName
                  ?.split(" ")
                  .map(n => n[0])
                  .join("") || "?";

                return (
                  <div
                    key={player._id}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${posCoords.x}%`, top: `${posCoords.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-cyan-500 text-white font-bold border-2 border-white shadow-md">
                      {initials}
                    </div>
                    <span className="text-xs mt-1">{player.player_competition_id?.player_id?.playerName || "-"}</span>
                  </div>
                );
              })
            )}

            {/* Jugadores equipo 2 (blanco, atacan izquierda) */}
            {Object.entries(team2Grouped).map(([pos, playersInPos]) =>
              playersInPos.map((player, idx) => {
                const posCoords = getPlayerPosition(pos, team2Formation, idx, playersInPos.length);
                const initials = player.player_competition_id?.player_id?.playerName
                  ?.split(" ")
                  .map(n => n[0])
                  .join("") || "?";

                return (
                  <div
                    key={player._id}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${100 - posCoords.x}%`, top: `${posCoords.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white text-black font-bold border-2 border-cyan-500 shadow-md">
                      {initials}
                    </div>
                    <span className="text-xs mt-1">{player.player_competition_id?.player_id?.playerName || "-"}</span>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
