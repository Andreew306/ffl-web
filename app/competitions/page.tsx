// app/competitions/page.tsx
import dbConnect from "@/lib/db/mongoose";
import Competition from "@/lib/models/Competition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Target } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type CompetitionDoc = {
  _id: string;
  type: string;
  season_id?: string | number;
  season?: string | number;
  division?: number;
  start_date?: Date | string;
  end_date?: Date | string;
  image?: string;
  status?: string;
  team_count?: number;
  match_count?: number;
  champion_team_id?: string;
  champion_name?: string;
};

type SeasonGroup = {
  _id: string;
  title: string;
  season?: string | number;
  competitions: CompetitionDoc[];
  startDate: Date | string | null;
  endDate: Date | string | null;
};

export const revalidate = 60;

export default async function CompetitionsPage() {
  await dbConnect();

  const competitions = await Competition.find({
    type: { $in: ["league", "cup", "supercup", "summer_cup", "nations_cup"] },
  }).lean<CompetitionDoc[]>();

  const groupedSeasons: Record<string, SeasonGroup> = {};
  competitions.forEach((comp) => {
    let key = "";
    if (["league", "cup", "supercup"].includes(comp.type)) {
      const seasonId = comp.season_id || comp.season || "no-season";
      key = `season-${seasonId}`;
      if (!groupedSeasons[key]) {
        groupedSeasons[key] = {
          _id: key,
          season: seasonId,
          competitions: [],
          startDate: null,
          endDate: null,
          title: `Season ${seasonId}`,
        };
      }
      groupedSeasons[key].competitions.push(comp);

      if (comp.type === "league" && comp.division === 1) {
        groupedSeasons[key].startDate = comp.start_date ?? null;
        groupedSeasons[key].endDate = comp.end_date ?? null;
      }
    } else {
      key = `${comp.type}-${comp._id}`;
      groupedSeasons[key] = {
        _id: comp._id,
        title: comp.type === "summer_cup" ? "Summer Cup" : "Nations Cup",
        competitions: [comp],
        startDate: comp.start_date ?? null,
        endDate: comp.end_date ?? null,
      };
    }
  });

  const seasonsArray = Object.values(groupedSeasons).sort(
    (a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Tournaments and Seasons
          </h1>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {seasonsArray.map((season) => (
              <Card
                key={season._id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20 hover:border-cyan-500/40 transition-all group"
              >
                <div className="relative overflow-hidden h-48">
                  <Image
                    src={season.competitions[0]?.image || "/placeholder.svg"}
                    alt={season.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="default">{season.competitions[0]?.status || "Unknown"}</Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-xl text-white group-hover:text-cyan-400 transition-colors">
                    {season.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      <span className="text-gray-300">
                        {season.startDate ? new Date(season.startDate).toLocaleDateString("en-GB") : "-"}
                        {" - "}
                        {season.endDate ? new Date(season.endDate).toLocaleDateString("en-GB") : "-"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      <span className="text-gray-300">
                        {season.competitions.reduce((sum, c) => sum + (c.team_count || 0), 0)} teams
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-green-400" />
                      <span className="text-gray-300">
                        {season.competitions.reduce((sum, c) => sum + (c.match_count || 0), 0)} matches
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    {season.competitions.map((c, idx) => {
                      if (!c.champion_team_id && !c.champion_name) return null;
                      let emoji = "";
                      switch (c.type) {
                        case "league":
                          emoji = c.division === 1 ? "🥇" : "🥈";
                          break;
                        case "cup":
                          emoji = "🏆";
                          break;
                        case "supercup":
                          emoji = "🌟";
                          break;
                        case "summer_cup":
                          emoji = "🌞";
                          break;
                        case "nations_cup":
                          emoji = "🌍";
                          break;
                      }
                      return (
                        <div key={idx} className="flex items-center space-x-1 text-gray-300">
                          <span>{emoji}</span>
                          <span>{c.champion_name || "No champion"}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`grid ${season.competitions.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
                    {orderCompetitions(season.competitions).map((c, idx) => {
                      let styles = "";
                      let label = "";

                      switch (c.type) {
                        case "league":
                          label = `Div ${c.division}`;
                          styles =
                            c.division === 1
                              ? "bg-cyan-400 hover:bg-cyan-500 text-white"
                              : "bg-yellow-500 hover:bg-yellow-600 text-white";
                          break;
                        case "cup":
                          label = "Cup";
                          styles = "bg-orange-400 hover:bg-orange-500 text-white";
                          break;
                        case "supercup":
                          label = "Supercup";
                          styles = "bg-red-500 hover:bg-red-600 text-white";
                          break;
                        case "summer_cup":
                          label = "Summer Cup";
                          styles = "bg-emerald-400 hover:bg-emerald-500 text-white";
                          break;
                        case "nations_cup":
                          label = "Nations Cup";
                          styles = "bg-purple-400 hover:bg-purple-500 text-white";
                          break;
                        default:
                          return null;
                      }

                      return (
                        <Link
                          key={idx}
                          href={`/seasons/${season._id}?highlight=${c.type === "league" ? `div${c.division}` : c.type}`}
                          className={`inline-block text-center py-2 px-3 rounded ${styles}`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function orderCompetitions(list: CompetitionDoc[]) {
  const order: Record<string, number> = {
    div1: 1,
    div2: 2,
    cup: 3,
    supercup: 4,
    summer_cup: 5,
    nations_cup: 6,
  };
  const getKey = (comp: CompetitionDoc) =>
    comp.type === "league" ? `div${comp.division ?? ""}` : comp.type;
  return list.sort((a, b) => (order[getKey(a)] || 99) - (order[getKey(b)] || 99));
}
