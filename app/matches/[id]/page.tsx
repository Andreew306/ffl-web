import connectDB from "@/lib/db/mongoose";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats";
import "@/lib/models/PlayerCompetition";
import "@/lib/models/Player";
import GoalModel from "@/lib/models/Goal";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMinutesSeconds } from "@/lib/utils";
import { notFound } from "next/navigation";

function getTwemojiUrl(emoji: string) {
  if (!emoji) return "";
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16))
    .join("-");
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`;
}

function StatBar({ value1, value2 }: { value1: number; value2: number }) {
  const total = value1 + value2;
  const width1 = total === 0 ? 50 : (value1 / total) * 100;
  const width2 = total === 0 ? 50 : (value2 / total) * 100;
  return (
    <div className="flex h-4 w-full bg-slate-700/70 rounded overflow-hidden my-1">
      <div className="bg-teal-400" style={{ width: `${width1}%` }} />
      <div className="bg-white" style={{ width: `${width2}%` }} />
    </div>
  );
}

function formatSeconds(value: number) {
  return formatMinutesSeconds(value);
}

function formatPercent(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.0%";
  return `${num.toFixed(1)}%`;
}

function getTeamStatValue(team: any, key: string) {
  if (!team) return 0;
  const direct = team[key];
  if (direct != null) return direct;
  if (key === "shots_on_goal") return team.shotsOnGoal ?? 0;
  if (key === "shots_off_goal") return team.shotsOffGoal ?? 0;
  return 0;
}

function normalizeStatValue(value: unknown) {
  if (typeof value === "boolean") return value ? 1 : 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  await connectDB();

  const match = await MatchModel.findById(id)
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id" },
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id" },
    })
    .lean();

  if (!match) return notFound();

  const teamStats = await TeamMatchStatsModel.find({ match_id: match._id })
    .populate({
      path: "team_competition_id",
      populate: { path: "team_id" },
    })
    .lean();

  const playerStats = await PlayerMatchStatsModel.find({ match_id: match._id })
    .populate({
      path: "player_competition_id",
      populate: { path: "player_id" },
    })
    .lean();

  const goals = await GoalModel.find({ match_id: match._id })
    .populate({
      path: "scorer_id",
      populate: { path: "player_id" },
    })
    .populate({
      path: "assist_id",
      populate: { path: "player_id" },
    })
    .populate({
      path: "preassist_id",
      populate: { path: "player_id" },
    })
    .populate({
      path: "team_competition_id",
    })
    .lean();

  const team1CompetitionId = match.team1_competition_id?._id?.toString() || "";
  const team2CompetitionId = match.team2_competition_id?._id?.toString() || "";
  const goalsByTeam = goals.reduce(
    (
      acc: {
        team1: { scorer: string; minuteLabel: string; minuteValue: number }[];
        team2: { scorer: string; minuteLabel: string; minuteValue: number }[];
      },
      goal: any
    ) => {
      const teamCompetitionId =
        goal.team_competition_id?._id?.toString() || goal.team_competition_id?.toString() || "";
      const scorerName =
        goal.scorer_id?.player_id?.player_name ||
        goal.scorer_id?.player_id?.playerName ||
        "-";
      const assistName =
        goal.assist_id?.player_id?.player_name ||
        goal.assist_id?.player_id?.playerName ||
        "";
      const preassistName =
        goal.preassist_id?.player_id?.player_name ||
        goal.preassist_id?.player_id?.playerName ||
        "";
      const isOwnGoal = Boolean(
        goal.own_goal ?? goal.ownGoal ?? goal.is_own_goal ?? goal.isOwnGoal
      );
      const scorerParts = [scorerName];
      if (assistName) scorerParts.push(`(${assistName})`);
      if (preassistName) scorerParts.push(`(${preassistName})`);
      if (isOwnGoal) scorerParts.push("[OG]");
      const scorer = scorerParts.join(" ");
      const rawSeconds = Number(goal.minute);
      const minuteValue = Number.isFinite(rawSeconds) ? rawSeconds : 999999;
      const minuteLabel = Number.isFinite(rawSeconds) ? formatSeconds(rawSeconds) : "-";
      const entry = { scorer, minuteLabel, minuteValue };
      if (teamCompetitionId && teamCompetitionId === team1CompetitionId) {
        acc.team1.push(entry);
      } else if (teamCompetitionId && teamCompetitionId === team2CompetitionId) {
        acc.team2.push(entry);
      }
      return acc;
    },
    { team1: [], team2: [] }
  );

  const goalTimelineMap = new Map<
    number,
    { minuteValue: number; minuteLabel: string; team1: string[]; team2: string[] }
  >();

  goalsByTeam.team1.forEach((entry) => {
    const bucket = goalTimelineMap.get(entry.minuteValue) || {
      minuteValue: entry.minuteValue,
      minuteLabel: entry.minuteLabel,
      team1: [],
      team2: [],
    };
    bucket.team1.push(entry.scorer);
    goalTimelineMap.set(entry.minuteValue, bucket);
  });

  goalsByTeam.team2.forEach((entry) => {
    const bucket = goalTimelineMap.get(entry.minuteValue) || {
      minuteValue: entry.minuteValue,
      minuteLabel: entry.minuteLabel,
      team1: [],
      team2: [],
    };
    bucket.team2.push(entry.scorer);
    goalTimelineMap.set(entry.minuteValue, bucket);
  });

  const goalTimeline = Array.from(goalTimelineMap.values()).sort(
    (a, b) => a.minuteValue - b.minuteValue
  );

  const starters = playerStats.filter((player) => Number(player.starter ?? 0) === 1);
  const substitutes = playerStats.filter((player) => Number(player.substitute ?? 0) === 1);
  const team1Substitutes = substitutes.filter((player) => {
    const teamId =
      player.team_competition_id?._id?.toString() ||
      player.team_competition_id?.toString() ||
      "";
    return teamId === team1CompetitionId;
  });
  const team2Substitutes = substitutes.filter((player) => {
    const teamId =
      player.team_competition_id?._id?.toString() ||
      player.team_competition_id?.toString() ||
      "";
    return teamId === team2CompetitionId;
  });
  const maxMinutesPlayed = playerStats.reduce((max, player) => {
    const value = Number(player.minutesPlayed ?? player.minutes_played ?? 0);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const team1Starters = starters.filter((player) => {
    const teamId =
      player.team_competition_id?._id?.toString() ||
      player.team_competition_id?.toString() ||
      "";
    return teamId === team1CompetitionId;
  });
  const team2Starters = starters.filter((player) => {
    const teamId =
      player.team_competition_id?._id?.toString() ||
      player.team_competition_id?.toString() ||
      "";
    return teamId === team2CompetitionId;
  });

  const buildLineupSlots = (players: any[], side: "home" | "away") => {
    const positionMap = new Map<string, any[]>();
    players.forEach((player) => {
      const key = player.position || "";
      if (!positionMap.has(key)) positionMap.set(key, []);
      positionMap.get(key)?.push(player);
    });

    const rows =
      side === "home"
        ? [
            { positions: ["GK"], x: 8 },
            { positions: ["LB", "CB", "RB"], x: 22 },
            { positions: ["DM", "CM", "AM"], x: 34 },
            { positions: ["LW", "ST", "RW"], x: 46 },
          ]
        : [
            { positions: ["LW", "ST", "RW"], x: 54 },
            { positions: ["DM", "CM", "AM"], x: 66 },
            { positions: ["LB", "CB", "RB"], x: 78 },
            { positions: ["GK"], x: 92 },
          ];

    const slots: {
      name: string;
      position: string;
      x: number;
      y: number;
      goals: number;
      assists: number;
      avg: number;
      substituted: boolean;
    }[] = [];
    rows.forEach((row) => {
      const rowPlayers: any[] = [];
      row.positions.forEach((pos) => {
        const bucket = positionMap.get(pos) || [];
        bucket.forEach((player) => rowPlayers.push(player));
      });
      const count = rowPlayers.length;
      const stPlayers = rowPlayers.filter((p) => p.position === "ST");
      rowPlayers.forEach((player, index) => {
        const name =
          player.player_competition_id?.player_id?.player_name ||
          player.player_competition_id?.player_id?.playerName ||
          "-";
        const position = player.position || "-";
        let x = row.x;
        let y = ((index + 1) / (count + 1)) * 100;
        if (position === "LW") y = 22;
        if (position === "RW") y = 78;
        if (position === "ST") y = 50;
        if (position === "LW" || position === "RW") {
          x = side === "home" ? row.x - 4 : row.x + 4;
        }
        if (position === "ST") {
          const stAnchorX = row.x + (side === "home" ? -1 : 1);
          const stIndex = stPlayers.findIndex((p) => p === player);
          if (stPlayers.length > 1 && stIndex >= 0) {
            x = stAnchorX;
            y = ((stIndex + 1) / (stPlayers.length + 1)) * 100;
          } else {
            x = stAnchorX;
            y = 50;
          }
        }
        slots.push({
          name,
          position,
          x,
          y,
          goals: Number(player.goals ?? 0),
          assists: Number(player.assists ?? 0),
          avg: Number(player.avg ?? 0),
          substituted:
            Number(player.minutesPlayed ?? player.minutes_played ?? 0) < maxMinutesPlayed - 20,
        });
      });
    });

    return slots;
  };

  const homeLineup = buildLineupSlots(team1Starters, "home");
  const awayLineup = buildLineupSlots(team2Starters, "away");
  const getPlayerTeamId = (player: any) =>
    player.team_competition_id?._id?.toString() || player.team_competition_id?.toString() || "";
  const team1Players = playerStats.filter(
    (player) => getPlayerTeamId(player) === team1CompetitionId
  );
  const team2Players = playerStats.filter(
    (player) => getPlayerTeamId(player) === team2CompetitionId
  );

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <section className="mb-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/80 px-6 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.35)]">
          <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-3 md:items-center">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-slate-950/60 p-2">
                <Image
                  src={match.team1_competition_id?.team_id?.image || "/placeholder.svg"}
                  alt={match.team1_competition_id?.team_id?.team_name || "Team 1"}
                  width={72}
                  height={72}
                  className="rounded-full"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Home</p>
                <p className="text-2xl font-semibold">
                  {match.team1_competition_id?.team_id?.team_name || "Team 1"}
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Matchday</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight">
                {match.score_team1 ?? 0} - {match.score_team2 ?? 0}
              </div>
              <Badge variant="outline" className="mt-3">
                {match.date ? new Date(match.date).toLocaleDateString() : "-"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 md:justify-end">
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Away</p>
                <p className="text-2xl font-semibold">
                  {match.team2_competition_id?.team_id?.team_name || "Team 2"}
                </p>
              </div>
              <div className="rounded-full bg-slate-950/60 p-2">
                <Image
                  src={match.team2_competition_id?.team_id?.image || "/placeholder.svg"}
                  alt={match.team2_competition_id?.team_id?.team_name || "Team 2"}
                  width={72}
                  height={72}
                  className="rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl bg-slate-950/40 px-6 py-5">
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center text-xs uppercase tracking-[0.2em] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            <span>{match.team1_competition_id?.team_id?.team_name || "Team 1"}</span>
          </div>
          <div className="text-center text-[10px] text-slate-500">Goals</div>
          <div className="flex items-center justify-end gap-2">
            <span>{match.team2_competition_id?.team_id?.team_name || "Team 2"}</span>
            <span className="h-2 w-2 rounded-full bg-teal-400" />
          </div>
        </div>

        {goalTimeline.length ? (
          <div className="flex flex-col items-center space-y-3 text-sm">
            {goalTimeline.map((entry, idx) => (
              <div
                key={`${entry.minuteLabel}-${idx}`}
                className="grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-6"
              >
                <div className="flex flex-col items-end text-slate-200">
                  {entry.team1.map((scorer, scorerIdx) => (
                    <span key={`${entry.minuteLabel}-l-${scorerIdx}`}>{scorer}</span>
                  ))}
                </div>
                <div className="min-w-[56px] text-center text-teal-300">
                  {entry.minuteLabel}
                </div>
                <div className="flex flex-col items-start text-slate-200">
                  {entry.team2.map((scorer, scorerIdx) => (
                    <span key={`${entry.minuteLabel}-r-${scorerIdx}`}>{scorer}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500">No goals</div>
        )}
      </section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-950/60 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600">
            Overview
          </TabsTrigger>
          <TabsTrigger value="teamStats" className="data-[state=active]:bg-purple-600">
            Teams
          </TabsTrigger>
          <TabsTrigger value="playerStats" className="data-[state=active]:bg-yellow-600">
            Players
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="bg-slate-800 mb-4 p-4">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">Overview del Partido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-center mb-2">Statistics</h3>

                                {[
                  { key: "possession", label: "POSSESSION", isPercent: true },
                  { key: "kicks", label: "KICKS" },
                  { key: "passes", label: "PASSES" },
                  { key: "shots_on_goal", label: "SHOTS ON GOAL" },
                  { key: "shots_off_goal", label: "SHOTS OFF GOAL" },
                  { key: "saves", label: "SAVES" },
                  { key: "cs", label: "CS" },
                ].map((stat) => {
                  const raw1 = getTeamStatValue(teamStats[0], stat.key);
                  const raw2 = getTeamStatValue(teamStats[1], stat.key);
                  const value1 = normalizeStatValue(raw1);
                  const value2 = normalizeStatValue(raw2);
                  const display1 = stat.isPercent ? formatPercent(value1) : value1;
                  const display2 = stat.isPercent ? formatPercent(value2) : value2;
  return (
                    <div key={stat.key} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-sky-300">{display1}</span>
                        <span className="font-semibold tracking-[0.3em] text-white">
                          {stat.label}
                        </span>
                        <span className="text-white">{display2}</span>
                      </div>
                      <StatBar value1={Number(value1) || 0} value2={Number(value2) || 0} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teamStats">
          <div className="rounded-2xl bg-slate-800/60 p-4">
            <div className="relative">
              <div className="mx-auto w-full max-w-7xl">
                <div className="relative aspect-[21/9] w-full rounded-2xl bg-slate-700/60 shadow-inner">
              <div className="absolute inset-2 rounded-xl border border-white/25" />
              <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-white/20" />
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              <div className="absolute left-2 right-2 top-2 h-px bg-white/10" />
              <div className="absolute left-2 right-2 bottom-2 h-px bg-white/10" />
              <div className="absolute left-2 top-2 h-6 w-6 rounded-br-full border-b border-r border-white/20" />
              <div className="absolute right-2 top-2 h-6 w-6 rounded-bl-full border-b border-l border-white/20" />
              <div className="absolute left-2 bottom-2 h-6 w-6 rounded-tr-full border-t border-r border-white/20" />
              <div className="absolute right-2 bottom-2 h-6 w-6 rounded-tl-full border-t border-l border-white/20" />
              <div className="absolute left-2 top-1/2 h-[56%] w-[18%] -translate-y-1/2 rounded-r-xl border border-white/20" />
              <div className="absolute right-2 top-1/2 h-[56%] w-[18%] -translate-y-1/2 rounded-l-xl border border-white/20" />
              <div className="absolute left-2 top-1/2 h-[30%] w-[7%] -translate-y-1/2 rounded-r-lg border border-white/20" />
              <div className="absolute right-2 top-1/2 h-[30%] w-[7%] -translate-y-1/2 rounded-l-lg border border-white/20" />
              <div className="absolute left-[18%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/30" />
              <div className="absolute right-[18%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/30" />
              <div className="absolute left-[18%] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border border-white/20 border-r-0" />
              <div className="absolute right-[18%] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border border-white/20 border-l-0" />

              {homeLineup.map((slot, idx) => (
                <div
                  key={`home-${slot.position}-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <div className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-400 text-[11px] font-semibold text-slate-900">
                    {slot.position}
                    {slot.assists > 0 && (
                      <span className="absolute -left-3.5 -top-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                        🥾{slot.assists}
                      </span>
                    )}
                    {slot.substituted && (
                      <span className="absolute -right-3.5 -top-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                        ⬇️
                      </span>
                    )}
                    {slot.goals > 0 && (
                      <span className="absolute -left-3.5 -bottom-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                        ⚽{slot.goals}
                      </span>
                    )}
                    <span className="absolute -right-3.5 -bottom-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                      {slot.avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 max-w-[96px] text-[11px] text-white">
                    {slot.name}
                  </div>
                </div>
              ))}

              {awayLineup.map((slot, idx) => (
                <div
                  key={`away-${slot.position}-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <div className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-900">
                    {slot.position}
                    {slot.assists > 0 && (
                      <span className="absolute -left-3.5 -top-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                        🥾{slot.assists}
                      </span>
                    )}
                    {slot.substituted && (
                      <span className="absolute -right-3.5 -top-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                        ⬇️
                      </span>
                    )}
                    {slot.goals > 0 && (
                      <span className="absolute -left-3.5 -bottom-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                        ⚽{slot.goals}
                      </span>
                    )}
                    <span className="absolute -right-3.5 -bottom-1 rounded-full bg-slate-800/90 px-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 shadow-sm">
                      {slot.avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 max-w-[96px] text-[11px] text-white">
                    {slot.name}
                  </div>
                </div>
              ))}
            </div>
                <aside className="mt-4 w-full max-w-sm rounded-2xl bg-slate-900/60 p-4 text-white lg:mt-0 lg:w-80 lg:absolute lg:right-0 lg:top-0 lg:h-full">
                <h4 className="text-xs uppercase tracking-[0.3em] text-slate-400">Substitutes</h4>
                {substitutes.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                        {match.team1_competition_id?.team_id?.team_name || "Team 1"}
                      </div>
                      <ul className="mt-2 space-y-2">
                        {team1Substitutes.map((player) => {
                          const name =
                            player.player_competition_id?.player_id?.player_name ||
                            player.player_competition_id?.player_id?.playerName ||
                            "-";
                          return (
                            <li key={player._id} className="truncate">
                              {name}
                            </li>
                          );
                        })}
                        {!team1Substitutes.length && (
                          <li className="text-xs text-slate-500">-</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                        {match.team2_competition_id?.team_id?.team_name || "Team 2"}
                      </div>
                      <ul className="mt-2 space-y-2">
                        {team2Substitutes.map((player) => {
                          const name =
                            player.player_competition_id?.player_id?.player_name ||
                            player.player_competition_id?.player_id?.playerName ||
                            "-";
                          return (
                            <li key={player._id} className="truncate">
                              {name}
                            </li>
                          );
                        })}
                        {!team2Substitutes.length && (
                          <li className="text-xs text-slate-500">-</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">No substitutes</p>
                )}
                </aside>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="playerStats">
          <div className="space-y-6">
            {[
              {
                title: match.team1_competition_id?.team_id?.team_name || "Team 1",
                players: team1Players,
                accent: "red",
              },
              {
                title: match.team2_competition_id?.team_id?.team_name || "Team 2",
                players: team2Players,
                accent: "blue",
              },
            ].map((group) => (
              <div key={group.title} className="rounded-2xl bg-slate-800/60 p-4">
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-sm font-semibold ${
                      group.accent === "red" ? "text-rose-200" : "text-sky-200"
                    }`}
                  >
                    {group.title}
                  </h3>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    Player Stats
                  </span>
                </div>
                <div
                  className={`mt-3 overflow-x-auto rounded-xl border bg-slate-900/40 ${
                    group.accent === "red"
                      ? "border-rose-500/30"
                      : "border-sky-500/30"
                  }`}
                >
                  <table className="w-full min-w-[1200px] border-collapse text-xs text-white">
                    <thead>
                      <tr
                        className={`border-b bg-slate-900/70 text-slate-300 ${
                          group.accent === "red"
                            ? "border-rose-500/30"
                            : "border-sky-500/30"
                        }`}
                      >
                        <th className="px-2 py-2 text-left">Id</th>
                        <th className="px-2 py-2 text-left">Nations</th>
                        <th className="px-2 py-2 text-left">Playername</th>
                        <th className="px-2 py-2 text-left">Position</th>
                        <th className="px-2 py-2 text-center">Won</th>
                        <th className="px-2 py-2 text-center">Draw</th>
                        <th className="px-2 py-2 text-center">Lost</th>
                        <th className="px-2 py-2 text-center">Starter</th>
                        <th className="px-2 py-2 text-center">Substitute</th>
                        <th className="px-2 py-2 text-center">Time</th>
                        <th className="px-2 py-2 text-center">Goals</th>
                        <th className="px-2 py-2 text-center">Assists</th>
                        <th className="px-2 py-2 text-center">Preassist</th>
                        <th className="px-2 py-2 text-center">Kicks</th>
                        <th className="px-2 py-2 text-center">Passes</th>
                        <th className="px-2 py-2 text-center">Fwd</th>
                        <th className="px-2 py-2 text-center">Lat</th>
                        <th className="px-2 py-2 text-center">Back</th>
                        <th className="px-2 py-2 text-center">Keypass</th>
                        <th className="px-2 py-2 text-center">Autopass</th>
                        <th className="px-2 py-2 text-center">Misspass</th>
                        <th className="px-2 py-2 text-center">Shots on goal</th>
                        <th className="px-2 py-2 text-center">Shots off goal</th>
                        <th className="px-2 py-2 text-center">Saves</th>
                        <th className="px-2 py-2 text-center">Clear</th>
                        <th className="px-2 py-2 text-center">Recoveries</th>
                        <th className="px-2 py-2 text-center">Goals conceded</th>
                        <th className="px-2 py-2 text-center">CS</th>
                        <th className="px-2 py-2 text-center">Owngoals</th>
                        <th className="px-2 py-2 text-center">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.players.map((player, idx) => {
                        const name =
                          player.player_competition_id?.player_id?.player_name ||
                          player.player_competition_id?.player_id?.playerName ||
                          "-";
                        const country = player.player_competition_id?.player_id?.country || "";
                        const timeSeconds = player.minutesPlayed ?? player.minutes_played ?? 0;
                        return (
                          <tr
                            key={player._id}
                            className={`border-b transition-colors ${
                              group.accent === "red"
                                ? "border-rose-500/10"
                                : "border-sky-500/10"
                            } ${
                              idx % 2 === 0
                                ? group.accent === "red"
                                  ? "bg-rose-500/5"
                                  : "bg-sky-500/5"
                                : "bg-slate-900/10"
                            } hover:bg-slate-800/40`}
                          >
                            <td className="px-2 py-2">{player.player_match_stats_id ?? "-"}</td>
                            <td className="px-2 py-2">{country || "-"}</td>
                            <td className="px-2 py-2">{name}</td>
                            <td className="px-2 py-2">{player.position || "-"}</td>
                            <td className="px-2 py-2 text-center">
                              {player.won ?? player.matchesWon ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {player.draw ?? player.matchesDraw ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {player.lost ?? player.matchesLost ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">{player.starter ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.substitute ?? 0}</td>
                            <td className="px-2 py-2 text-center">
                              {formatSeconds(Number(timeSeconds) || 0)}
                            </td>
                            <td className="px-2 py-2 text-center">{player.goals ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.assists ?? 0}</td>
                            <td className="px-2 py-2 text-center">
                              {player.preassists ?? player.preassist ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">{player.kicks ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.passes ?? 0}</td>
                            <td className="px-2 py-2 text-center">
                              {player.passes_forward ?? player.passesForward ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {player.passes_lateral ?? player.passesLateral ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {player.passes_backward ?? player.passesBackward ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">{player.keypass ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.autopass ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.misspass ?? 0}</td>
                            <td className="px-2 py-2 text-center">
                              {player.shots_on_goal ?? player.shotsOnGoal ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {player.shots_off_goal ?? player.shotsOffGoal ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {player.shotsDefended ?? player.saves ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">{player.clearances ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.recoveries ?? 0}</td>
                            <td className="px-2 py-2 text-center">
                              {player.goals_conceded ?? player.goalsConceded ?? 0}
                            </td>
                            <td className="px-2 py-2 text-center">{player.cs ?? 0}</td>
                            <td className="px-2 py-2 text-center">{player.owngoals ?? 0}</td>
                            <td className="px-2 py-2 text-center">
                              {Number(player.avg ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}























