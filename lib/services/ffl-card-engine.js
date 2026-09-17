const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const hallOfFamePath = path.resolve(process.cwd(), 'reports', 'ffl_hall_of_fame.csv');
const teamStrengthPath = path.resolve(process.cwd(), 'reports', 'team_strength_ranking.csv');
let hallOfFameCache = null;
let ratingReferenceCache = null;
let teamStrengthCache = null;

function looseModel(name, collectionName) {
  const modelName = `CardEngine_${name}`;
  if (mongoose.models[modelName]) return mongoose.models[modelName];
  return mongoose.model(modelName, new mongoose.Schema({}, { strict: false, collection: collectionName }), collectionName);
}

async function getModels() {
  return {
    Competition: looseModel('competitions', 'competitions'),
    Team: looseModel('teams', 'teams'),
    TeamCompetition: looseModel('teamcompetitions', 'teamcompetitions'),
    Player: looseModel('players', 'players'),
    PlayerCompetition: looseModel('playercompetitions', 'playercompetitions'),
    Match: looseModel('matches', 'matches'),
    TeamMatchStats: looseModel('teammatchstats', 'teammatchstats'),
    PlayerMatchStats: looseModel('playermatchstats', 'playermatchstats'),
  };
}
const PLAYER_COMPETITION_STATS_SELECT = '_id player_id team_competition_id player_competition_id is_active position matches_played matches_won matches_draw matches_lost starter substitute minutes_played goals assists preassists kicks passes passes_forward passes_lateral passes_backward keypass autopass misspass shots_on_goal shots_off_goal saves clearances recoveries goals_conceded cs owngoals avg TOTW TOTS MVP';
const PLAYER_MATCH_STATS_SELECT = '_id match_id team_competition_id player_competition_id position won draw lost starter substitute minutes_played goals assists preassists kicks passes passes_forward passes_lateral passes_backward keypass autopass misspass shots_on_goal shots_off_goal saves clearances recoveries goals_conceded cs owngoals avg TOTW MVP';

const STAT_FIELDS = [
  'matches_played',
  'matches_won',
  'matches_draw',
  'matches_lost',
  'starter',
  'substitute',
  'minutes_played',
  'goals',
  'assists',
  'preassists',
  'kicks',
  'passes',
  'passes_forward',
  'passes_lateral',
  'passes_backward',
  'keypass',
  'autopass',
  'misspass',
  'shots_on_goal',
  'shots_off_goal',
  'saves',
  'clearances',
  'recoveries',
  'goals_conceded',
  'cs',
  'owngoals',
  'TOTW',
  'TOTS',
  'MVP',
];

const MATCH_VOLUME_FIELDS = new Set(['matches_played', 'starter', 'substitute', 'minutes_played']);
const AWARD_FIELDS = new Set(['TOTW', 'TOTS', 'MVP']);
const NEGATIVE_STAT_FIELDS = new Set(['misspass', 'goals_conceded', 'owngoals', 'matches_lost']);
const MIN_RELIABLE_MATCHES = 18;
const RATING_REFERENCE_TTL_MS = 5 * 60 * 1000;
const RATING_REFERENCE_PERCENTILE = 0.95;

function competitionLevelWeights(competition) {
  const type = competition?.type || '';
  const division = Number(competition?.division) || null;
  const era = competitionEraWeights(competition);
  const applyEra = weights => ({
    stats: weights.stats * era.stats,
    awards: weights.awards * era.awards,
    avg: weights.avg * era.avg,
  });
  if (type === 'league') {
    if (division === 1) return applyEra({ stats: 1, awards: 1, avg: 1 });
    if (division === 2) return applyEra({ stats: 0.5, awards: 0.5, avg: 0.5 });
    if (division === 3) return applyEra({ stats: 0.2, awards: 0.2, avg: 0.2 });
    if (division >= 4) return applyEra({ stats: 0.1, awards: 0.1, avg: 0.1 });
    return applyEra({ stats: 0.5, awards: 0.5, avg: 0.5 });
  }
  if (type === 'cup' || type === 'nations_cup') return applyEra({ stats: 0.8, awards: 0.8, avg: 0.8 });
  if (type === 'supercup' || type === 'summer_cup') return applyEra({ stats: 0.7, awards: 0.7, avg: 0.7 });
  if (type === 'friendly') return applyEra({ stats: 0.1, awards: 0.1, avg: 0.1 });
  return applyEra({ stats: 0.5, awards: 0.5, avg: 0.5 });
}

function competitionEraWeights(competition) {
  const season = Number(competition?.season) || null;
  const startYear = competition?.start_date ? new Date(competition.start_date).getFullYear() : null;
  if (season != null) {
    const cappedSeason = Math.max(1, Math.min(9, season));
    const progress = (cappedSeason - 1) / 8;
    return {
      stats: 0.35 + progress * 0.65,
      awards: 0.72 + progress * 0.28,
      avg: 0.82 + progress * 0.18,
    };
  }
  if (startYear) {
    const progress = Math.max(0, Math.min(1, (startYear - 2023) / 3));
    return {
      stats: 0.35 + progress * 0.65,
      awards: 0.72 + progress * 0.28,
      avg: 0.82 + progress * 0.18,
    };
  }
  return { stats: 0.94, awards: 0.95, avg: 0.98 };
}

function statLevelWeight(field, weights) {
  if (MATCH_VOLUME_FIELDS.has(field)) return 1;
  if (AWARD_FIELDS.has(field)) return weights.awards;
  return weights.stats;
}

function opponentStatWeight(field, opponentWeight) {
  if (MATCH_VOLUME_FIELDS.has(field)) return 1;
  if (NEGATIVE_STAT_FIELDS.has(field)) return Math.max(0.75, Math.min(1.2, 2 - opponentWeight));
  return Math.max(0.8, Math.min(1.25, opponentWeight));
}

function contextStatWeight(field, contextWeight) {
  if (MATCH_VOLUME_FIELDS.has(field)) return 1;
  if (NEGATIVE_STAT_FIELDS.has(field)) return Math.max(0.5, Math.min(1.2, 2 - contextWeight));
  return Math.max(0.5, Math.min(1.2, contextWeight));
}

function send(res, status, body, type = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function modelFor(db, name, baseModel) {
  return db.models[name] || db.model(name, baseModel.schema, baseModel.collection.name);
}

function normalizePlayerName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function loadTeamStrengthWeights() {
  if (teamStrengthCache) return teamStrengthCache;
  const weights = new Map();
  if (!fs.existsSync(teamStrengthPath)) {
    teamStrengthCache = weights;
    return weights;
  }
  const lines = fs.readFileSync(teamStrengthPath, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || '');
  const rows = lines
    .filter(line => line.trim())
    .map(line => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    })
    .map(row => ({
      team: row.team,
      score: Number(row.score) || 0,
    }))
    .filter(row => row.team);
  const scores = rows.map(row => row.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 1);
  const spread = Math.max(maxScore - minScore, 0.001);

  for (const row of rows) {
    const normalized = Math.max(0, Math.min(1, (row.score - minScore) / spread));
    weights.set(normalizePlayerName(row.team), 0.8 + normalized * 0.45);
  }
  teamStrengthCache = weights;
  return weights;
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function loadHallOfFame() {
  if (hallOfFameCache) return hallOfFameCache;
  const entries = new Map();
  if (!fs.existsSync(hallOfFamePath)) {
    hallOfFameCache = { entries, maxTotal: 0 };
    return hallOfFameCache;
  }

  const lines = fs.readFileSync(hallOfFamePath, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || '');
  const maxTotal = lines.reduce((max, line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    return Math.max(max, Number(row.Total) || 0);
  }, 0);

  for (const line of lines) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    const total = Number(row.Total) || 0;
    entries.set(normalizePlayerName(row.Player), {
      rank: Number(row.Rank) || null,
      total,
      roles: Number(row.Roles) || 0,
      prestigeScore: maxTotal > 0 ? total / maxTotal : 0,
    });
  }

  hallOfFameCache = { entries, maxTotal };
  return hallOfFameCache;
}

function hallOfFameEntry(playerName) {
  return loadHallOfFame().entries.get(normalizePlayerName(playerName)) || null;
}

function competitionLabel(competition) {
  const parts = [`#${competition.competition_id}`];
  if (competition.season != null) parts.push(`S${competition.season}`);
  if (competition.division != null) parts.push(`Div ${competition.division}`);
  parts.push(competition.type || 'competition');
  return parts.join(' Â· ');
}

async function getCompetitions() {
  const { Competition, TeamCompetition, PlayerCompetition } = await getModels();
  const [competitions, teamCompetitions] = await Promise.all([
    Competition.find({})
      .select('_id competition_id type season division status start_date end_date')
      .sort({ start_date: -1, competition_id: -1 })
      .lean(),
    TeamCompetition.find({})
      .select('_id competition_id kits')
      .lean(),
  ]);

  const tcIds = teamCompetitions.map(item => item._id);
  const playerCounts = tcIds.length
    ? await PlayerCompetition.aggregate([
        { $match: { team_competition_id: { $in: tcIds } } },
        { $group: { _id: '$team_competition_id', count: { $sum: 1 } } },
      ])
    : [];
  const countByTc = new Map(playerCounts.map(item => [String(item._id), item.count]));
  const statsByCompetition = new Map();

  for (const teamCompetition of teamCompetitions) {
    const key = String(teamCompetition.competition_id);
    const stats = statsByCompetition.get(key) || {
      teamCount: 0,
      kitTeamCount: 0,
      playerCount: 0,
    };
    const playerCount = countByTc.get(String(teamCompetition._id)) || 0;
    if (playerCount > 0) stats.teamCount++;
    if (playerCount > 0 && teamCompetition.kits && teamCompetition.kits.length) {
      stats.kitTeamCount++;
    }
    stats.playerCount += playerCount;
    statsByCompetition.set(key, stats);
  }

  return competitions
    .map(competition => {
      const stats = statsByCompetition.get(String(competition._id)) || {
        teamCount: 0,
        kitTeamCount: 0,
        playerCount: 0,
      };
      return {
        id: String(competition._id),
        competitionId: competition.competition_id,
        label: competitionLabel(competition),
        type: competition.type,
        season: competition.season ?? null,
        division: competition.division ?? null,
        status: competition.status,
        startDate: competition.start_date || null,
        ...stats,
      };
    })
    .filter(competition => competition.playerCount > 0)
    .sort((a, b) => {
      const kitDifference = Number(b.kitTeamCount > 0) - Number(a.kitTeamCount > 0);
      if (kitDifference) return kitDifference;
      return String(b.competitionId).localeCompare(String(a.competitionId), undefined, { numeric: true });
    });
}

async function getPlayers(competitionId) {
  if (!mongoose.Types.ObjectId.isValid(competitionId)) {
    throw new Error('Invalid competition id');
  }

  const { Competition, Team, TeamCompetition, Player, PlayerCompetition, Match, TeamMatchStats, PlayerMatchStats } = await getModels();
  const teamCompetitions = await TeamCompetition.find({ competition_id: competitionId })
    .select('_id team_id team_competition_id kits')
    .lean();
  if (!teamCompetitions.length) return { teams: [], players: [] };

  const [competition, teams, playerCompetitions] = await Promise.all([
    Competition.findById(competitionId)
      .select('_id competition_id type season division start_date')
      .lean(),
    Team.find({ _id: { $in: teamCompetitions.map(item => item.team_id) } })
      .select('_id team_id team_name image country')
      .lean(),
    PlayerCompetition.find({
      team_competition_id: { $in: teamCompetitions.map(item => item._id) },
    })
      .select(PLAYER_COMPETITION_STATS_SELECT)
      .lean(),
  ]);
  const players = await Player.find({
    _id: { $in: playerCompetitions.map(item => item.player_id) },
  })
    .select('_id player_id player_name country avatar')
    .lean();

  const teamById = new Map(teams.map(team => [String(team._id), team]));
  const tcById = new Map(teamCompetitions.map(item => [String(item._id), item]));
  const competitionById = competition ? new Map([[String(competition._id), competition]]) : new Map();
  const playerById = new Map(players.map(player => [String(player._id), player]));
  const ratingReferences = await getRatingReferences({
    Competition,
    Team,
    TeamCompetition,
    Player,
    PlayerCompetition,
    Match,
    TeamMatchStats,
    PlayerMatchStats,
  });

  const teamRows = teamCompetitions
    .map(teamCompetition => {
      const team = teamById.get(String(teamCompetition.team_id));
      if (!team) return null;
      return {
        id: String(teamCompetition._id),
        teamCompetitionId: teamCompetition.team_competition_id ?? null,
        teamId: team.team_id,
        name: team.team_name,
        image: team.image || null,
        imageUrl: team.image ? `/api/teams/${team._id}/image` : null,
        country: team.country || null,
        kits: (teamCompetition.kits || []).map((kit, index) => ({
          index,
          kind: kit.kind,
          color: kit.color,
          imageUrl: `/api/kits/${teamCompetition._id}/${index}/image`,
        })),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const matchStatsBundle = await getMatchStatsBundle(
    PlayerMatchStats,
    playerCompetitions.map(item => item._id),
    Match,
    TeamMatchStats,
    TeamCompetition,
    Team
  );

  const playerRows = playerCompetitions
    .map(playerCompetition => {
      const player = playerById.get(String(playerCompetition.player_id));
      const teamCompetition = tcById.get(String(playerCompetition.team_competition_id));
      if (!player || !teamCompetition || !teamById.has(String(teamCompetition.team_id))) return null;
      const position = playerCompetition.position || '';
      const stats = sumPositionAwareStats(
        [playerCompetition],
        matchStatsBundle.feats,
        matchStatsBundle.rowsByPlayerCompetition,
        matchStatsBundle.opponentWeightsByMatchStat,
        tcById,
        competitionById,
        position,
        hallOfFameEntry(player.player_name)
      );
      applyRatingReferences(stats, ratingReferences);
      return {
        id: String(playerCompetition._id),
        playerCompetitionId: playerCompetition.player_competition_id ?? null,
        playerId: player.player_id,
        name: player.player_name,
        country: player.country || '',
        avatar: player.avatar || '',
        position,
        active: !!playerCompetition.is_active,
        teamId: String(playerCompetition.team_competition_id),
        stats,
        attributes: calculateAttributes(stats, position),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { teams: teamRows, players: playerRows };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getPlayerHistory(query) {
  const search = String(query || '').trim();
  if (!search) return { teams: [], players: [] };

  const { Competition, Team, TeamCompetition, Player, PlayerCompetition, Match, TeamMatchStats, PlayerMatchStats } = await getModels();
  const playerNameFilter = search.length <= 2
    ? new RegExp(`^${escapeRegex(search)}$`, 'i')
    : new RegExp(escapeRegex(search), 'i');
  const players = await Player.find({
    player_name: playerNameFilter,
  })
    .select('_id player_id player_name country avatar')
    .sort({ player_name: 1 })
    .limit(30)
    .lean();
  if (!players.length) return { teams: [], players: [] };

  const playerCompetitions = await PlayerCompetition.find({
    player_id: { $in: players.map(player => player._id) },
  })
    .select(PLAYER_COMPETITION_STATS_SELECT)
    .lean();
  if (!playerCompetitions.length) return { teams: [], players: [] };

  const [teamCompetitions, matchStatsBundle] = await Promise.all([
    TeamCompetition.find({ _id: { $in: playerCompetitions.map(item => item.team_competition_id) } })
      .select('_id team_id competition_id team_competition_id kits')
      .lean(),
    getMatchStatsBundle(PlayerMatchStats, playerCompetitions.map(item => item._id), Match, TeamMatchStats, TeamCompetition, Team),
  ]);
  const scoringFeats = matchStatsBundle.feats;
  const competitions = await Competition.find({
    _id: { $in: teamCompetitions.map(item => item.competition_id) },
  })
    .select('_id competition_id type season division start_date')
    .lean();
  const teams = await Team.find({
    _id: { $in: teamCompetitions.map(item => item.team_id) },
  })
    .select('_id team_id team_name image country')
    .lean();

  const playerById = new Map(players.map(player => [String(player._id), player]));
  const tcById = new Map(teamCompetitions.map(item => [String(item._id), item]));
  const teamById = new Map(teams.map(team => [String(team._id), team]));
  const competitionById = new Map(competitions.map(competition => [String(competition._id), competition]));
  const ratingReferences = await getRatingReferences({
    Competition,
    Team,
    TeamCompetition,
    Player,
    PlayerCompetition,
    Match,
    TeamMatchStats,
    PlayerMatchStats,
  });

  const teamRows = teamCompetitions
    .map(teamCompetition => {
      const team = teamById.get(String(teamCompetition.team_id));
      const competition = competitionById.get(String(teamCompetition.competition_id));
      if (!team) return null;
      return {
        id: String(teamCompetition._id),
        teamCompetitionId: teamCompetition.team_competition_id ?? null,
        teamId: team.team_id,
        name: team.team_name,
        image: team.image || null,
        imageUrl: team.image ? `/api/teams/${team._id}/image` : null,
        country: team.country || null,
        competitionId: competition ? String(competition._id) : null,
        competitionLabel: competition ? competitionLabel(competition) : 'Sin competicion',
        kits: (teamCompetition.kits || []).map((kit, index) => ({
          index,
          kind: kit.kind,
          color: kit.color,
          imageUrl: `/api/kits/${teamCompetition._id}/${index}/image`,
        })),
      };
    })
    .filter(Boolean);

  const teamRowById = new Map(teamRows.map(team => [team.id, team]));
  const rows = [];
  const playerCompetitionGroups = new Map();

  for (const playerCompetition of playerCompetitions) {
    const player = playerById.get(String(playerCompetition.player_id));
    const teamCompetition = tcById.get(String(playerCompetition.team_competition_id));
    const team = teamCompetition ? teamRowById.get(String(teamCompetition._id)) : null;
    if (!player || !teamCompetition || !team) continue;

    const key = String(player._id);
    const group = playerCompetitionGroups.get(key) || [];
    group.push(playerCompetition);
    playerCompetitionGroups.set(key, group);

    const position = playerCompetition.position || '';
    const stats = sumPositionAwareStats(
      [playerCompetition],
      scoringFeats,
      matchStatsBundle.rowsByPlayerCompetition,
      matchStatsBundle.opponentWeightsByMatchStat,
      tcById,
      competitionById,
      position,
      hallOfFameEntry(player.player_name)
    );
    applyRatingReferences(stats, ratingReferences);
    rows.push({
      id: String(playerCompetition._id),
      playerCompetitionId: playerCompetition.player_competition_id ?? null,
      playerId: player.player_id,
      source: 'teamcompetition',
      sourceLabel: team.competitionLabel,
      name: player.player_name,
      country: player.country || '',
      avatar: player.avatar || '',
      position,
      active: !!playerCompetition.is_active,
      teamId: String(playerCompetition.team_competition_id),
      stats,
      attributes: calculateAttributes(stats, position),
    });
  }

  for (const player of players) {
    const group = playerCompetitionGroups.get(String(player._id)) || [];
    if (!group.length) continue;
    const sorted = group.slice().sort((a, b) => {
      const tcA = tcById.get(String(a.team_competition_id));
      const tcB = tcById.get(String(b.team_competition_id));
      const compA = tcA ? competitionById.get(String(tcA.competition_id)) : null;
      const compB = tcB ? competitionById.get(String(tcB.competition_id)) : null;
      return String(compB?.start_date || compB?.competition_id || '').localeCompare(String(compA?.start_date || compA?.competition_id || ''), undefined, { numeric: true });
    });
    const visualTeamCompetition = sorted.find(item => {
      const team = teamRowById.get(String(item.team_competition_id));
      return team && (team.imageUrl || team.kits.length);
    }) || sorted[0];
    const globalPosition = dominantMatchPosition(group, matchStatsBundle.rowsByPlayerCompetition);
    const stats = sumPositionAwareStats(
      group,
      scoringFeats,
      matchStatsBundle.rowsByPlayerCompetition,
      matchStatsBundle.opponentWeightsByMatchStat,
      tcById,
      competitionById,
      globalPosition,
      hallOfFameEntry(player.player_name)
    );
    applyRatingReferences(stats, ratingReferences);
    rows.unshift({
      id: `global:${player._id}`,
      playerCompetitionId: null,
      playerId: player.player_id,
      source: 'global',
      sourceLabel: 'Global historico',
      name: player.player_name,
      country: player.country || '',
      avatar: player.avatar || '',
      position: globalPosition,
      active: group.some(item => item.is_active),
      teamId: String(visualTeamCompetition.team_competition_id),
      stats,
      attributes: calculateAttributes(stats, globalPosition),
    });
  }

  rows.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'global' ? -1 : 1;
    return `${a.name} ${a.sourceLabel}`.localeCompare(`${b.name} ${b.sourceLabel}`);
  });

  return { teams: teamRows, players: rows };
}

async function getTopCards(limit = 20) {
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 20));
  const { Competition, Team, TeamCompetition, Player, PlayerCompetition, Match, TeamMatchStats, PlayerMatchStats } = await getModels();
  const playerCompetitions = await PlayerCompetition.find({})
    .select(PLAYER_COMPETITION_STATS_SELECT)
    .lean();
  if (!playerCompetitions.length) return { players: [] };

  const [players, teamCompetitions, matchStatsBundle, ratingReferences] = await Promise.all([
    Player.find({ _id: { $in: playerCompetitions.map(item => item.player_id) } })
      .select('_id player_id player_name country avatar')
      .lean(),
    TeamCompetition.find({ _id: { $in: playerCompetitions.map(item => item.team_competition_id) } })
      .select('_id team_id competition_id team_competition_id')
      .lean(),
    getMatchStatsBundle(PlayerMatchStats, playerCompetitions.map(item => item._id), Match, TeamMatchStats, TeamCompetition, Team),
    getRatingReferences({ Competition, Team, TeamCompetition, Player, PlayerCompetition, Match, TeamMatchStats, PlayerMatchStats }),
  ]);
  const competitions = await Competition.find({
    _id: { $in: teamCompetitions.map(item => item.competition_id) },
  })
    .select('_id competition_id type season division start_date')
    .lean();

  const playerById = new Map(players.map(player => [String(player._id), player]));
  const tcById = new Map(teamCompetitions.map(item => [String(item._id), item]));
  const competitionById = new Map(competitions.map(competition => [String(competition._id), competition]));
  const groups = new Map();
  for (const playerCompetition of playerCompetitions) {
    const key = String(playerCompetition.player_id);
    const group = groups.get(key) || [];
    group.push(playerCompetition);
    groups.set(key, group);
  }

  const rows = [];
  for (const [playerId, group] of groups.entries()) {
    const player = playerById.get(playerId);
    if (!player) continue;
    const position = dominantMatchPosition(group, matchStatsBundle.rowsByPlayerCompetition);
    const stats = sumPositionAwareStats(
      group,
      matchStatsBundle.feats,
      matchStatsBundle.rowsByPlayerCompetition,
      matchStatsBundle.opponentWeightsByMatchStat,
      tcById,
      competitionById,
      position,
      hallOfFameEntry(player.player_name)
    );
    applyRatingReferences(stats, ratingReferences);
    if (number(stats.matches_played) < MIN_RELIABLE_MATCHES) continue;
    rows.push({
      playerId: player.player_id,
      name: player.player_name,
      country: player.country || '',
      position,
      stats,
      attributes: calculateAttributes(stats, position),
    });
  }

  rows.sort((a, b) => {
    const ovrDiff = b.attributes.ovr - a.attributes.ovr;
    if (ovrDiff) return ovrDiff;
    const hallDiff = number(b.stats.hall_total) - number(a.stats.hall_total);
    if (hallDiff) return hallDiff;
    return number(b.stats.avg) - number(a.stats.avg);
  });

  return { players: rows.slice(0, safeLimit), ratingReferences };
}

async function getScoringFeats(PlayerMatchStats, playerCompetitionIds) {
  if (!playerCompetitionIds.length) return new Map();
  const rows = await PlayerMatchStats.find({
    player_competition_id: { $in: playerCompetitionIds },
  })
    .select('player_competition_id goals')
    .lean();

  const featsByPlayerCompetition = new Map();
  for (const row of rows) {
    const key = String(row.player_competition_id);
    const feats = featsByPlayerCompetition.get(key) || { braces: 0, hatTricks: 0, pokers: 0 };
    const goals = Number(row.goals) || 0;
    if (goals >= 4) feats.pokers += 1;
    else if (goals === 3) feats.hatTricks += 1;
    else if (goals === 2) feats.braces += 1;
    featsByPlayerCompetition.set(key, feats);
  }
  return featsByPlayerCompetition;
}

async function getMatchStatsBundle(PlayerMatchStats, playerCompetitionIds, Match = null, TeamMatchStats = null, TeamCompetition = null, Team = null) {
  if (!playerCompetitionIds.length) {
    return { feats: new Map(), rowsByPlayerCompetition: new Map(), opponentWeightsByMatchStat: new Map() };
  }
  const rows = await PlayerMatchStats.find({
    player_competition_id: { $in: playerCompetitionIds },
  })
    .select(PLAYER_MATCH_STATS_SELECT)
    .lean();
  const opponentWeightsByMatchStat = await getOpponentWeights(rows, Match, TeamMatchStats, TeamCompetition, Team);

  const feats = new Map();
  const rowsByPlayerCompetition = new Map();
  for (const row of rows) {
    const key = String(row.player_competition_id);
    const list = rowsByPlayerCompetition.get(key) || [];
    list.push(row);
    rowsByPlayerCompetition.set(key, list);

    const scoring = feats.get(key) || { braces: 0, hatTricks: 0, pokers: 0 };
    const goals = Number(row.goals) || 0;
    if (goals >= 4) scoring.pokers += 1;
    else if (goals === 3) scoring.hatTricks += 1;
    else if (goals === 2) scoring.braces += 1;
    feats.set(key, scoring);
  }
  return { feats, rowsByPlayerCompetition, opponentWeightsByMatchStat };
}

function teamMatchStrength(row) {
  const matches = 1;
  const goalsScored = number(row.goals_scored);
  const goalsConceded = number(row.goals_conceded);
  const totalShots = number(row.shots_on_goal) + number(row.shots_off_goal);
  const defendedShots = number(row.saves) + goalsConceded;
  return (
    ratio(number(row.points), matches * 3) * 0.28 +
    ratio(number(row.won), matches) * 0.18 +
    capped(goalsScored - goalsConceded + 4, 8) * 0.18 +
    capped(goalsScored, 6) * 0.1 +
    capped(totalShots, 12) * 0.08 +
    ratio(number(row.cs), matches) * 0.08 +
    ratio(number(row.saves), defendedShots) * 0.05 +
    capped(number(row.passes), 120) * 0.05
  );
}

async function getOpponentWeights(matchStatRows, Match, TeamMatchStats, TeamCompetition, Team) {
  const weights = new Map();
  if (!Match || !TeamMatchStats || !matchStatRows.length) return weights;

  const matchIds = [...new Set(matchStatRows.map(row => row.match_id).filter(Boolean).map(String))];
  if (!matchIds.length) return weights;

  const [matches, teamMatchStats] = await Promise.all([
    Match.find({ _id: { $in: matchIds } })
      .select('_id team1_competition_id team2_competition_id')
      .lean(),
    TeamMatchStats.find({ match_id: { $in: matchIds } })
      .select('match_id team_competition_id won draw lost goals_scored goals_conceded points possession kicks passes shots_on_goal shots_off_goal saves cs')
      .lean(),
  ]);

  const matchById = new Map(matches.map(match => [String(match._id), match]));
  const teamCompetitionIds = [...new Set(teamMatchStats
    .map(row => row.team_competition_id)
    .filter(Boolean)
    .map(String))];
  const teamCompetitionById = new Map();
  const teamById = new Map();
  if (TeamCompetition && Team && teamCompetitionIds.length) {
    const teamCompetitions = await TeamCompetition.find({ _id: { $in: teamCompetitionIds } })
      .select('_id team_id')
      .lean();
    const teams = await Team.find({ _id: { $in: teamCompetitions.map(item => item.team_id).filter(Boolean) } })
      .select('_id team_name')
      .lean();
    teamCompetitions.forEach(item => teamCompetitionById.set(String(item._id), item));
    teams.forEach(team => teamById.set(String(team._id), team));
  }
  const teamStrengthWeights = loadTeamStrengthWeights();
  const strengthByTeamCompetition = new Map();
  for (const row of teamMatchStats) {
    const key = String(row.team_competition_id);
    const item = strengthByTeamCompetition.get(key) || { total: 0, count: 0 };
    item.total += teamMatchStrength(row);
    item.count += 1;
    strengthByTeamCompetition.set(key, item);
  }

  const strengths = [...strengthByTeamCompetition.values()]
    .map(item => item.count ? item.total / item.count : 0)
    .filter(value => Number.isFinite(value));
  const minStrength = Math.min(...strengths, 0);
  const maxStrength = Math.max(...strengths, 1);
  const spread = Math.max(maxStrength - minStrength, 0.001);

  function fallbackStrengthWeight(teamCompetitionId) {
    const item = strengthByTeamCompetition.get(String(teamCompetitionId || ''));
    if (!item || !item.count) return null;
    const strength = item.total / item.count;
    const normalizedStrength = Math.max(0, Math.min(1, (strength - minStrength) / spread));
    return 0.9 + normalizedStrength * 0.2;
  }

  function rankingStrengthWeight(teamCompetitionId) {
    const teamCompetition = teamCompetitionById.get(String(teamCompetitionId || ''));
    const team = teamCompetition ? teamById.get(String(teamCompetition.team_id)) : null;
    return team ? teamStrengthWeights.get(normalizePlayerName(team.team_name)) : null;
  }

  function teamStrengthWeight(teamCompetitionId) {
    return rankingStrengthWeight(teamCompetitionId) || fallbackStrengthWeight(teamCompetitionId) || 1;
  }

  for (const row of matchStatRows) {
    const match = matchById.get(String(row.match_id));
    if (!match) continue;
    const teamId = String(row.team_competition_id || '');
    const team1Id = String(match.team1_competition_id || '');
    const team2Id = String(match.team2_competition_id || '');
    const opponentId = teamId === team1Id ? team2Id : teamId === team2Id ? team1Id : '';
    if (!opponentId) continue;

    const ownWeight = teamStrengthWeight(teamId);
    const opponentWeight = teamStrengthWeight(opponentId);
    const relativeContext = Math.max(0.5, Math.min(1.2, 1 + (opponentWeight - ownWeight) * 0.35));
    weights.set(String(row._id), {
      opponent: opponentWeight,
      own: ownWeight,
      context: relativeContext,
    });
  }

  return weights;
}

function addHallStats(stats, hallEntry) {
  stats.prestige_score = hallEntry?.prestigeScore || 0;
  stats.hall_total = hallEntry?.total || 0;
  stats.hall_rank = hallEntry?.rank || null;
  stats.hall_roles = hallEntry?.roles || 0;
  return stats;
}

function statsFromPlayerCompetition(playerCompetition, feats = {}, hallEntry = null) {
  const stats = {};
  for (const field of STAT_FIELDS) {
    stats[field] = Number(playerCompetition[field]) || 0;
  }
  stats.avg = Number(playerCompetition.avg) || 0;
  stats.level_score = 1;
  stats.competitions_count = 1;
  stats.braces = feats.braces || 0;
  stats.hat_tricks = feats.hatTricks || 0;
  stats.pokers = feats.pokers || 0;
  return addHallStats(stats, hallEntry);
}

function sumStats(playerCompetitions, featsByPlayerCompetition, tcById = new Map(), competitionById = new Map()) {
  const stats = {};
  for (const field of STAT_FIELDS) stats[field] = 0;
  stats.braces = 0;
  stats.hat_tricks = 0;
  stats.pokers = 0;
  let avgNumerator = 0;
  let avgDenominator = 0;
  let levelNumerator = 0;
  let levelDenominator = 0;

  for (const playerCompetition of playerCompetitions) {
    const teamCompetition = tcById.get(String(playerCompetition.team_competition_id));
    const competition = teamCompetition ? competitionById.get(String(teamCompetition.competition_id)) : null;
    const levelWeights = competitionLevelWeights(competition);
    for (const field of STAT_FIELDS) {
      stats[field] += (Number(playerCompetition[field]) || 0) * statLevelWeight(field, levelWeights);
    }
    const feats = featsByPlayerCompetition.get(String(playerCompetition._id)) || {};
    stats.braces += (feats.braces || 0) * levelWeights.stats;
    stats.hat_tricks += (feats.hatTricks || 0) * levelWeights.stats;
    stats.pokers += (feats.pokers || 0) * levelWeights.stats;
    const matches = Number(playerCompetition.matches_played) || 0;
    avgNumerator += (Number(playerCompetition.avg) || 0) * levelWeights.avg * matches;
    avgDenominator += matches;
    levelNumerator += levelWeights.stats * matches;
    levelDenominator += matches;
  }
  stats.avg = avgDenominator > 0 ? avgNumerator / avgDenominator : 0;
  stats.level_score = levelDenominator > 0 ? levelNumerator / levelDenominator : 1;
  stats.competitions_count = playerCompetitions.length;
  return stats;
}

function emptyStats() {
  const stats = {};
  for (const field of STAT_FIELDS) stats[field] = 0;
  stats.braces = 0;
  stats.hat_tricks = 0;
  stats.pokers = 0;
  return stats;
}

function matchStatValue(row, field) {
  if (field === 'matches_played') return row.matches_played == null ? 1 : Number(row.matches_played) || 0;
  if (field === 'matches_won') return row.won == null ? Number(row.matches_won) || 0 : Number(row.won) || 0;
  if (field === 'matches_draw') return row.draw == null ? Number(row.matches_draw) || 0 : Number(row.draw) || 0;
  if (field === 'matches_lost') return row.lost == null ? Number(row.matches_lost) || 0 : Number(row.lost) || 0;
  if (field === 'TOTS') return 0;
  return Number(row[field]) || 0;
}

function addSharedStats(target, source) {
  target.avg = source.avg;
  target.level_score = source.level_score;
  target.competitions_count = source.competitions_count;
  target.prestige_score = source.prestige_score;
  target.hall_total = source.hall_total;
  target.hall_rank = source.hall_rank;
  target.hall_roles = source.hall_roles;
  target.opponent_strength = source.opponent_strength || 1;
  if (source.rating_refs) target.rating_refs = source.rating_refs;
  return target;
}

function applyRatingReferences(stats, references) {
  stats.rating_refs = references;
  for (const attributeStats of Object.values(stats.attribute_stats || {})) {
    attributeStats.rating_refs = references;
  }
  return stats;
}

function sumPositionAwareStats(playerCompetitions, featsByPlayerCompetition, rowsByPlayerCompetition, opponentWeightsByMatchStat, tcById, competitionById, targetPosition, hallEntry = null) {
  const baseStats = addHallStats(sumStats(playerCompetitions, featsByPlayerCompetition, tcById, competitionById), hallEntry);
  baseStats.position_matches = {};
  let opponentNumerator = 0;
  let opponentDenominator = 0;
  const attributeStats = {
    sho: emptyStats(),
    pas: emptyStats(),
    def: emptyStats(),
    dri: emptyStats(),
  };

  for (const playerCompetition of playerCompetitions) {
    const teamCompetition = tcById.get(String(playerCompetition.team_competition_id));
    const competition = teamCompetition ? competitionById.get(String(teamCompetition.competition_id)) : null;
    const levelWeights = competitionLevelWeights(competition);
    const matchRows = rowsByPlayerCompetition.get(String(playerCompetition._id)) || [];
    const sourceRows = matchRows.length ? matchRows : [playerCompetition];

    for (const sourceRow of sourceRows) {
      const sourcePosition = sourceRow.position || playerCompetition.position || '';
      const sourceMatches = sourceRow.matches_played == null ? 1 : Number(sourceRow.matches_played) || 0;
      if (sourcePosition) {
        baseStats.position_matches[sourcePosition] = (baseStats.position_matches[sourcePosition] || 0) + sourceMatches;
      }
      const compatibility = positionCompatibility(targetPosition, sourcePosition);
      const opponentContext = opponentWeightsByMatchStat.get(String(sourceRow._id)) || {};
      const opponentWeight = typeof opponentContext === 'number' ? opponentContext : opponentContext.opponent || 1;
      const contextWeight = typeof opponentContext === 'number' ? 1 : opponentContext.context || 1;
      opponentNumerator += opponentWeight * sourceMatches;
      opponentDenominator += sourceMatches;
      for (const stats of Object.values(attributeStats)) {
        for (const field of STAT_FIELDS) {
          const fieldWeight = MATCH_VOLUME_FIELDS.has(field)
            ? 1
            : compatibility * opponentStatWeight(field, opponentWeight) * contextStatWeight(field, contextWeight);
          stats[field] += matchStatValue(sourceRow, field) * statLevelWeight(field, levelWeights) * fieldWeight;
        }
      }
    }

    const feats = featsByPlayerCompetition.get(String(playerCompetition._id)) || {};
    const compatibility = positionCompatibility(targetPosition, playerCompetition.position || '');
    for (const stats of Object.values(attributeStats)) {
      stats.braces += (feats.braces || 0) * levelWeights.stats * compatibility;
      stats.hat_tricks += (feats.hatTricks || 0) * levelWeights.stats * compatibility;
      stats.pokers += (feats.pokers || 0) * levelWeights.stats * compatibility;
      stats.TOTS += (Number(playerCompetition.TOTS) || 0) * levelWeights.awards * compatibility;
    }
  }
  baseStats.opponent_strength = opponentDenominator > 0 ? opponentNumerator / opponentDenominator : 1;

  baseStats.attribute_stats = Object.fromEntries(
    Object.entries(attributeStats).map(([key, stats]) => [key, addSharedStats(stats, baseStats)])
  );
  return baseStats;
}

function dominantPosition(playerCompetitions) {
  const minutesByPosition = new Map();
  for (const playerCompetition of playerCompetitions) {
    const position = playerCompetition.position || '';
    if (!position) continue;
    const minutes = Number(playerCompetition.minutes_played) || 0;
    const matches = Number(playerCompetition.matches_played) || 0;
    minutesByPosition.set(position, (minutesByPosition.get(position) || 0) + minutes + matches);
  }
  return [...minutesByPosition.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || playerCompetitions[0]?.position || '';
}

function dominantMatchPosition(playerCompetitions, rowsByPlayerCompetition = new Map()) {
  const minutesByPosition = new Map();
  for (const playerCompetition of playerCompetitions) {
    const rows = rowsByPlayerCompetition.get(String(playerCompetition._id)) || [];
    if (!rows.length) {
      const position = playerCompetition.position || '';
      if (!position) continue;
      minutesByPosition.set(position, (minutesByPosition.get(position) || 0) + number(playerCompetition.minutes_played) + number(playerCompetition.matches_played));
      continue;
    }
    for (const row of rows) {
      const position = row.position || playerCompetition.position || '';
      if (!position) continue;
      const minutes = number(row.minutes_played);
      const matches = row.matches_played == null ? 1 : number(row.matches_played);
      minutesByPosition.set(position, (minutesByPosition.get(position) || 0) + minutes + matches);
    }
  }
  return [...minutesByPosition.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || dominantPosition(playerCompetitions);
}

function positionGroup(position) {
  const value = String(position || '').toUpperCase();
  if (value === 'GK') return 'gk';
  if (['CB', 'LB', 'RB'].includes(value)) return 'def';
  if (['DM', 'CM', 'AM'].includes(value)) return 'mid';
  return 'fwd';
}

function positionCompatibility(targetPosition, sourcePosition) {
  const target = positionGroup(targetPosition);
  const source = positionGroup(sourcePosition);
  if (target === source) return 1;
  const matrix = {
    gk: { def: 0.12, mid: 0.08, fwd: 0.05 },
    def: { gk: 0.35, mid: 0.75, fwd: 0.3 },
    mid: { gk: 0.12, def: 0.7, fwd: 0.7 },
    fwd: { gk: 0.1, def: 0.25, mid: 0.55 },
  };
  return matrix[target]?.[source] ?? 0.35;
}

function rawReferenceMetrics(stats = {}) {
  const matches = Math.max(number(stats.matches_played), 1);
  const rawMatches = number(stats.matches_played);
  const minutes = number(stats.minutes_played);
  const minuteUnits = Math.max(minutes / 600, 1);
  const goals = number(stats.goals);
  const assists = number(stats.assists);
  const preassists = number(stats.preassists);
  const kicks = number(stats.kicks);
  const passes = number(stats.passes);
  const keypass = number(stats.keypass);
  const autopass = number(stats.autopass);
  const misspass = number(stats.misspass);
  const shotsOnGoal = number(stats.shots_on_goal);
  const shotsOffGoal = number(stats.shots_off_goal);
  const saves = number(stats.saves);
  const clearances = number(stats.clearances);
  const recoveries = number(stats.recoveries);
  const goalsConceded = number(stats.goals_conceded);
  const totalShots = shotsOnGoal + shotsOffGoal;
  const passAttempts = passes + autopass + misspass;
  const defendedShots = saves + goalsConceded;

  return {
    minutesPm: perMatch(minutes, matches),
    gpm: perMatch(goals, matches),
    goalsPerMin: perMatch(goals, minuteUnits),
    shotTarget: ratio(shotsOnGoal, totalShots),
    goalAcc: ratio(goals, shotsOnGoal),
    shotsPm: perMatch(totalShots, matches),
    shotsPerMin: perMatch(totalShots, minuteUnits),
    bracesPm: perMatch(number(stats.braces), matches),
    hatPm: perMatch(number(stats.hat_tricks), matches),
    pokerPm: perMatch(number(stats.pokers), matches),
    passesPm: perMatch(passes, matches),
    passesPerMin: perMatch(passes, minuteUnits),
    passAcc: ratio(passes + autopass, passAttempts),
    misspassRate: ratio(misspass, passAttempts),
    keypassPm: perMatch(keypass, matches),
    keypassPerMin: perMatch(keypass, minuteUnits),
    assistsPm: perMatch(assists, matches),
    assistsPerMin: perMatch(assists, minuteUnits),
    preassistsPm: perMatch(preassists, matches),
    autopassPm: perMatch(autopass, matches),
    autopassPerMin: perMatch(autopass, minuteUnits),
    autopassRate: ratio(autopass, kicks),
    savesPm: perMatch(saves, matches),
    savesPerMin: perMatch(saves, minuteUnits),
    clearancesPm: perMatch(clearances, matches),
    clearancesPerMin: perMatch(clearances, minuteUnits),
    recoveriesPm: perMatch(recoveries, matches),
    recoveriesPerMin: perMatch(recoveries, minuteUnits),
    goalsConcededPm: perMatch(goalsConceded, matches),
    goalsConcededPerMin: perMatch(goalsConceded, minuteUnits),
    ownGoalsPm: perMatch(number(stats.owngoals), matches),
    saveRate: ratio(saves, defendedShots),
    csRate: ratio(number(stats.cs), rawMatches),
    mvpPm: perMatch(number(stats.MVP), matches),
    totwPm: perMatch(number(stats.TOTW), matches),
    totsPm: perMatch(number(stats.TOTS), matches),
  };
}

function percentile(values, rank) {
  const sorted = values
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * rank) - 1));
  return sorted[index];
}

function fallbackRatingReferences() {
  return {
    percentile: RATING_REFERENCE_PERCENTILE,
    minutesPm: 1200,
    gpm: 2.2,
    goalsPerMin: 1.4,
    shotsPm: 7,
    shotsPerMin: 4.5,
    bracesPm: 0.35,
    hatPm: 0.18,
    pokerPm: 0.12,
    passesPm: 40,
    passesPerMin: 24,
    keypassPm: 8,
    keypassPerMin: 4.8,
    assistsPm: 1.4,
    assistsPerMin: 0.8,
    preassistsPm: 0.9,
    autopassPm: 16,
    autopassPerMin: 9.6,
    savesPm: 4,
    savesPerMin: 2.4,
    clearancesPm: 8,
    clearancesPerMin: 4.8,
    recoveriesPm: 18,
    recoveriesPerMin: 10.8,
    goalsConcededPm: 6,
    goalsConcededPerMin: 3.6,
    ownGoalsPm: 0.35,
    mvpPm: 0.25,
    totwPm: 0.25,
    totsPm: 0.08,
  };
}

async function getRatingReferences(models) {
  const now = Date.now();
  if (ratingReferenceCache && now - ratingReferenceCache.createdAt < RATING_REFERENCE_TTL_MS) {
    return ratingReferenceCache.value;
  }

  const { Competition, Team, TeamCompetition, Player, PlayerCompetition, Match, TeamMatchStats, PlayerMatchStats } = models;
  const playerCompetitions = await PlayerCompetition.find({})
    .select(PLAYER_COMPETITION_STATS_SELECT)
    .lean();
  if (!playerCompetitions.length) {
    const value = fallbackRatingReferences();
    ratingReferenceCache = { createdAt: now, value };
    return value;
  }

  const [players, teamCompetitions, matchStatsBundle] = await Promise.all([
    Player.find({ _id: { $in: playerCompetitions.map(item => item.player_id) } })
      .select('_id player_name')
      .lean(),
    TeamCompetition.find({ _id: { $in: playerCompetitions.map(item => item.team_competition_id) } })
      .select('_id competition_id')
      .lean(),
    getMatchStatsBundle(PlayerMatchStats, playerCompetitions.map(item => item._id), Match, TeamMatchStats, TeamCompetition, Team),
  ]);
  const competitions = await Competition.find({
    _id: { $in: teamCompetitions.map(item => item.competition_id) },
  })
    .select('_id competition_id type season division start_date')
    .lean();

  const playerById = new Map(players.map(player => [String(player._id), player]));
  const tcById = new Map(teamCompetitions.map(item => [String(item._id), item]));
  const competitionById = new Map(competitions.map(competition => [String(competition._id), competition]));
  const groups = new Map();
  for (const playerCompetition of playerCompetitions) {
    const key = String(playerCompetition.player_id);
    const group = groups.get(key) || [];
    group.push(playerCompetition);
    groups.set(key, group);
  }

  const metricBuckets = new Map();
  const addMetricSample = stats => {
    if (number(stats.matches_played) < 5 || number(stats.minutes_played) < 300) return;
    const values = rawReferenceMetrics(stats);
    for (const [key, value] of Object.entries(values)) {
      const bucket = metricBuckets.get(key) || [];
      bucket.push(value);
      metricBuckets.set(key, bucket);
    }
  };

  for (const [playerId, group] of groups.entries()) {
    const player = playerById.get(playerId);
    const position = dominantMatchPosition(group, matchStatsBundle.rowsByPlayerCompetition);
    const stats = sumPositionAwareStats(
      group,
      matchStatsBundle.feats,
      matchStatsBundle.rowsByPlayerCompetition,
      matchStatsBundle.opponentWeightsByMatchStat,
      tcById,
      competitionById,
      position,
      hallOfFameEntry(player?.player_name)
    );
    addMetricSample(stats);
    for (const attributeStats of Object.values(stats.attribute_stats || {})) {
      addMetricSample(attributeStats);
    }
  }

  const fallbacks = fallbackRatingReferences();
  const value = { ...fallbacks, percentile: RATING_REFERENCE_PERCENTILE };
  for (const key of Object.keys(fallbacks)) {
    if (key === 'percentile') continue;
    const reference = percentile(metricBuckets.get(key) || [], RATING_REFERENCE_PERCENTILE);
    if (reference > 0) value[key] = reference;
  }

  ratingReferenceCache = { createdAt: now, value };
  return value;
}

const ATTRIBUTE_FORMULA = {
  sho: {
    base: 69.9336,
    levelScore: 5.9267,
    avg: -10.7238,
    winRate: 0,
    gpm: 4.7753,
    shotTarget: -10.3932,
    goalAcc: 9.0473,
    shotsPm: 8.0047,
    bracesPm: 4.9733,
    hatPm: -0.6903,
    pokerPm: 1.1382,
    passesPm: -5.7926,
    keypassPm: 6.3282,
    assistsPm: 2.2646,
    mvpPm: 1.8751,
    totwPm: -1.1063,
    totsPm: 3.9062,
    isGk: -12.6373,
    isDef: -0.4915,
    isMid: 9.1971,
    isFwd: 8.0238,
  },
  pas: {
    base: 73.8831,
    levelScore: 10.051,
    avg: 3.4199,
    winRate: 0,
    passesPm: 1.5059,
    passesPerMin: 0.8,
    passAcc: 3.0269,
    misspassRate: -14,
    keypassPm: 4.3207,
    keypassPerMin: 1,
    assistsPm: 1.7364,
    assistsPerMin: 0.5,
    preassistsPm: 1.6067,
    autopassPm: -0.1651,
    mvpPm: 2.422,
    totwPm: -1.4131,
    totsPm: -6.9232,
    isGk: -0.4252,
    isDef: 2.0668,
    isMid: -1.9645,
    isFwd: -1.7101,
  },
  def: {
    base: 58,
    levelScore: 17,
    avg: 8,
    winRate: 0,
    savesPm: 8,
    savesPerMin: 0.8,
    clearancesPm: 2.7,
    clearancesPerMin: 0.9,
    recoveriesPm: 12,
    recoveriesPerMin: 1,
    saveRate: 9,
    csRate: 10,
    goalsConcededPm: -13,
    goalsConcededPerMin: -6,
    ownGoalsPm: -7,
    passesPm: 1,
    keypassPm: -1.5,
    mvpPm: -1,
    totwPm: 0,
    totsPm: 1,
    isGk: 2,
    isDef: 1.5,
    isMid: -6,
    isFwd: -4,
  },
  dri: {
    base: 67.1527,
    levelScore: 13.444,
    avg: 2.6177,
    winRate: 0,
    autopassPm: 9.7994,
    autopassRate: 17.1921,
    passesPm: 0.5682,
    keypassPm: 0.5437,
    assistsPm: 3.3717,
    mvpPm: -0.2854,
    totwPm: -0.9395,
    totsPm: -1.7179,
    isGk: -1.3801,
    isDef: -3.008,
    isMid: -2.2776,
    isFwd: -3.8019,
  },
  ovr: {
    base: 0,
    levelScore: 3,
    avg: 3,
    winRate: 4,
    lossRate: -4,
    drawRate: -0.5,
    starterRate: 0.8,
    subRate: -1,
    minutesPm: 0.7,
    misspassRate: -1,
    goalsConcededPm: -1,
    ownGoalsPm: -2,
    opponentStrength: 0,
    mvpPm: 0.8,
    totwPm: 0.4,
    totsPm: 1.2,
    prestigeScore: 4,
  },
};

const OVR_POSITION_WEIGHTS = {
  gk: { sho: 0.02, pas: 0.18, def: 0.55, dri: 0.15 },
  def: { sho: 0.02, pas: 0.22, def: 0.52, dri: 0.24 },
  mid: { sho: 0.12, pas: 0.34, def: 0.29, dri: 0.25 },
  fwd: { sho: 0.39, pas: 0.19, def: 0.06, dri: 0.36 },
};

function playerCompetitionFromStats(stats, position = '') {
  return {
    position,
    matches_played: stats.matches_played,
    goals: stats.goals,
    assists: stats.assists,
    preassists: stats.preassists,
    kicks: stats.kicks,
    passes: stats.passes,
    keypass: stats.keypass,
    autopass: stats.autopass,
    misspass: stats.misspass,
    shots_on_goal: stats.shots_on_goal,
    shots_off_goal: stats.shots_off_goal,
    saves: stats.saves,
    clearances: stats.clearances,
    recoveries: stats.recoveries,
    goals_conceded: stats.goals_conceded,
    cs: stats.cs,
  };
}

function clampScore(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function ratio(value, total) {
  return total > 0 ? value / total : 0;
}

function perMatch(value, matches) {
  return matches > 0 ? value / matches : 0;
}

function capped(value, cap) {
  return Math.max(0, Math.min(1, value / cap));
}

function referenceCap(stats, key, fallback) {
  const value = number(stats.rating_refs?.[key]);
  return value > 0 ? value : fallback;
}

function number(value) {
  return Number(value) || 0;
}

function featureScores(stats = {}, position = '') {
  const matches = Math.max(number(stats.matches_played), 1);
  const rawMatches = number(stats.matches_played);
  const minutes = number(stats.minutes_played);
  const minuteUnits = Math.max(minutes / 600, 1);
  const shotsOnGoal = number(stats.shots_on_goal);
  const shotsOffGoal = number(stats.shots_off_goal);
  const totalShots = shotsOnGoal + shotsOffGoal;
  const passes = number(stats.passes);
  const autopass = number(stats.autopass);
  const misspass = number(stats.misspass);
  const passAttempts = passes + autopass + misspass;
  const saves = number(stats.saves);
  const goalsConceded = number(stats.goals_conceded);
  const defendedShots = saves + goalsConceded;
  const group = positionGroup(position);

  return {
    base: 1,
    levelScore: number(stats.level_score) || 1,
    opponentStrength: number(stats.opponent_strength) || 1,
    avg: capped(number(stats.avg), 10),
    winRate: ratio(number(stats.matches_won), rawMatches),
    drawRate: ratio(number(stats.matches_draw), rawMatches),
    lossRate: ratio(number(stats.matches_lost), rawMatches),
    starterRate: ratio(number(stats.starter), rawMatches),
    subRate: ratio(number(stats.substitute), rawMatches),
    minutesPm: capped(perMatch(minutes, matches), referenceCap(stats, 'minutesPm', 1200)),
    gpm: capped(perMatch(number(stats.goals), matches), referenceCap(stats, 'gpm', 2.2)),
    goalsPerMin: capped(perMatch(number(stats.goals), minuteUnits), referenceCap(stats, 'goalsPerMin', 1.4)),
    shotTarget: ratio(shotsOnGoal, totalShots),
    goalAcc: ratio(number(stats.goals), shotsOnGoal),
    shotsPm: capped(perMatch(totalShots, matches), referenceCap(stats, 'shotsPm', 7)),
    shotsPerMin: capped(perMatch(totalShots, minuteUnits), referenceCap(stats, 'shotsPerMin', 4.5)),
    bracesPm: capped(perMatch(number(stats.braces), matches), referenceCap(stats, 'bracesPm', 0.35)),
    hatPm: capped(perMatch(number(stats.hat_tricks), matches), referenceCap(stats, 'hatPm', 0.18)),
    pokerPm: capped(perMatch(number(stats.pokers), matches), referenceCap(stats, 'pokerPm', 0.12)),
    passesPm: capped(perMatch(passes, matches), referenceCap(stats, 'passesPm', 40)),
    passesPerMin: capped(perMatch(passes, minuteUnits), referenceCap(stats, 'passesPerMin', 24)),
    passAcc: ratio(passes + autopass, passAttempts),
    misspassRate: ratio(misspass, passAttempts),
    keypassPm: capped(perMatch(number(stats.keypass), matches), referenceCap(stats, 'keypassPm', 8)),
    keypassPerMin: capped(perMatch(number(stats.keypass), minuteUnits), referenceCap(stats, 'keypassPerMin', 4.8)),
    assistsPm: capped(perMatch(number(stats.assists), matches), referenceCap(stats, 'assistsPm', 1.4)),
    assistsPerMin: capped(perMatch(number(stats.assists), minuteUnits), referenceCap(stats, 'assistsPerMin', 0.8)),
    preassistsPm: capped(perMatch(number(stats.preassists), matches), referenceCap(stats, 'preassistsPm', 0.9)),
    autopassPm: capped(perMatch(autopass, matches), referenceCap(stats, 'autopassPm', 16)),
    autopassPerMin: capped(perMatch(autopass, minuteUnits), referenceCap(stats, 'autopassPerMin', 9.6)),
    autopassRate: ratio(autopass, number(stats.kicks)),
    savesPm: capped(perMatch(saves, matches), referenceCap(stats, 'savesPm', 4)),
    savesPerMin: capped(perMatch(saves, minuteUnits), referenceCap(stats, 'savesPerMin', 2.4)),
    clearancesPm: capped(perMatch(number(stats.clearances), matches), referenceCap(stats, 'clearancesPm', 8)),
    clearancesPerMin: capped(perMatch(number(stats.clearances), minuteUnits), referenceCap(stats, 'clearancesPerMin', 4.8)),
    recoveriesPm: capped(perMatch(number(stats.recoveries), matches), referenceCap(stats, 'recoveriesPm', 18)),
    recoveriesPerMin: capped(perMatch(number(stats.recoveries), minuteUnits), referenceCap(stats, 'recoveriesPerMin', 10.8)),
    goalsConcededPm: capped(perMatch(goalsConceded, matches), referenceCap(stats, 'goalsConcededPm', 6)),
    goalsConcededPerMin: capped(perMatch(goalsConceded, minuteUnits), referenceCap(stats, 'goalsConcededPerMin', 3.6)),
    ownGoalsPm: capped(perMatch(number(stats.owngoals), matches), referenceCap(stats, 'ownGoalsPm', 0.35)),
    saveRate: ratio(saves, defendedShots),
    csRate: ratio(number(stats.cs), rawMatches),
    mvpPm: capped(perMatch(number(stats.MVP), matches), referenceCap(stats, 'mvpPm', 0.25)),
    totwPm: capped(perMatch(number(stats.TOTW), matches), referenceCap(stats, 'totwPm', 0.25)),
    totsPm: capped(perMatch(number(stats.TOTS), matches), referenceCap(stats, 'totsPm', 0.08)),
    prestigeScore: number(stats.prestige_score),
    isGk: group === 'gk' ? 1 : 0,
    isDef: group === 'def' ? 1 : 0,
    isMid: group === 'mid' ? 1 : 0,
    isFwd: group === 'fwd' ? 1 : 0,
  };
}

function linearScore(weights, features) {
  let value = 0;
  for (const [key, weight] of Object.entries(weights)) {
    value += (features[key] || 0) * weight;
  }
  return clampScore(value);
}

function linearValue(weights, features) {
  let value = 0;
  for (const [key, weight] of Object.entries(weights)) {
    value += (features[key] || 0) * weight;
  }
  return value;
}

function positionWeightedOvr({ sho, pas, def, dri }, position) {
  const weights = OVR_POSITION_WEIGHTS[positionGroup(position)] || OVR_POSITION_WEIGHTS.fwd;
  const value =
    sho * weights.sho +
    pas * weights.pas +
    def * weights.def +
    dri * weights.dri;
  return value / (weights.sho + weights.pas + weights.def + weights.dri);
}

function maxOvrForSample(stats = {}) {
  const matches = number(stats.matches_played);
  const competitions = number(stats.competitions_count);
  const prestigeScore = number(stats.prestige_score);
  const avg = number(stats.avg);
  const levelScore = number(stats.level_score) || 1;
  const eliteWithoutHall = matches >= 35 && avg >= 8.2 && levelScore >= 0.9;

  let cap = 80;
  if (matches < MIN_RELIABLE_MATCHES) return cap;
  if (matches >= 3 && avg >= 4.8) cap = 81;
  if (matches >= 5 && avg >= 5.2 && levelScore >= 0.45) cap = 82;
  if (matches >= 8 && avg >= 5.6 && levelScore >= 0.5) cap = 83;
  if (
    (matches >= 15 && avg >= 6 && levelScore >= 0.55) ||
    (matches >= 18 && avg >= 5.7 && levelScore >= 0.5)
  ) {
    cap = 84;
  }
  if (
    (matches >= 12 && avg >= 6.3 && levelScore >= 0.58 && prestigeScore >= 0.02) ||
    (matches >= 25 && avg >= 6 && levelScore >= 0.55)
  ) {
    cap = 85;
  }
  if (
    (matches >= 15 && avg >= 6.55 && levelScore >= 0.6 && prestigeScore >= 0.04) ||
    (matches >= 32 && avg >= 6.2 && levelScore >= 0.58 && prestigeScore >= 0.02)
  ) {
    cap = 86;
  }
  if (
    (matches >= 18 && avg >= 6.75 && levelScore >= 0.63 && prestigeScore >= 0.06) ||
    (matches >= 40 && avg >= 6.45 && levelScore >= 0.6 && prestigeScore >= 0.04)
  ) {
    cap = 87;
  }
  if (prestigeScore <= 0 && !eliteWithoutHall) return cap;

  if (
    (matches >= 20 && avg >= 6.8 && prestigeScore >= 0.05 && levelScore >= 0.65) ||
    (matches >= 35 && avg >= 6.6 && prestigeScore >= 0.12) ||
    eliteWithoutHall
  ) {
    cap = 88;
  }
  if (
    (matches >= 25 && avg >= 7.25 && prestigeScore >= 0.15 && levelScore >= 0.72) ||
    (matches >= 50 && avg >= 7 && prestigeScore >= 0.25) ||
    (matches >= 20 && avg >= 7.7 && prestigeScore >= 0.25) ||
    eliteWithoutHall
  ) {
    cap = 89;
  }
  if (
    (matches >= 45 && avg >= 7.55 && prestigeScore >= 0.4 && levelScore >= 0.78) ||
    (matches >= 60 && avg >= 7.8 && prestigeScore >= 0.33) ||
    (matches >= 55 && avg >= 7.1 && prestigeScore >= 0.65 && levelScore >= 0.8) ||
    (matches >= 60 && avg >= 7.3 && prestigeScore >= 0.4 && levelScore >= 0.8)
  ) {
    cap = 90;
  }
  if (
    (matches >= 60 && avg >= 8.3 && prestigeScore >= 0.75 && levelScore >= 0.82) ||
    (matches >= 60 && avg >= 7.5 && prestigeScore >= 0.9 && levelScore >= 0.82)
  ) {
    cap = 91;
  }
  return cap;
}

function maxAttributeForSample(stats = {}, attribute = '') {
  return 99;
}

function calculateAttributes(stats = {}, position = '') {
  const features = featureScores(stats, position);
  const attributeStats = stats.attribute_stats || {};
  const shoStats = attributeStats.sho || stats;
  const pasStats = attributeStats.pas || stats;
  const sho = Math.min(linearScore(ATTRIBUTE_FORMULA.sho, featureScores(shoStats, position)), maxAttributeForSample(shoStats, 'sho'));
  const pas = Math.min(linearScore(ATTRIBUTE_FORMULA.pas, featureScores(pasStats, position)), maxAttributeForSample(pasStats, 'pas'));
  const defStats = attributeStats.def || stats;
  const driStats = attributeStats.dri || stats;
  const def = Math.min(linearScore(ATTRIBUTE_FORMULA.def, featureScores(defStats, position)), maxAttributeForSample(defStats, 'def'));
  const dri = Math.min(linearScore(ATTRIBUTE_FORMULA.dri, featureScores(driStats, position)), maxAttributeForSample(driStats, 'dri'));
  const rawOvr = clampScore(positionWeightedOvr({ sho, pas, def, dri }, position) + linearValue(ATTRIBUTE_FORMULA.ovr, features));
  const ovr = Math.min(rawOvr, maxOvrForSample(stats));

  return {
    sho,
    pas,
    def,
    dri,
    ovr,
    feats: {
      braces: number(stats.braces),
      hatTricks: number(stats.hat_tricks),
      pokers: number(stats.pokers),
    },
  };
}

async function getGlobalCardByPlayerObjectId(playerObjectId) {
  const { Player } = await getModels();
  const player = await Player.findById(playerObjectId).select('_id player_name').lean();
  if (!player) throw new Error('Player not found.');
  const payload = await getPlayerHistory(player.player_name);
  const exact = normalizePlayerName(player.player_name);
  const row = (payload.players || []).find(item => String(item.id || '').startsWith('global:') && normalizePlayerName(item.name) === exact)
    || (payload.players || []).find(item => normalizePlayerName(item.name) === exact)
    || null;
  if (!row) throw new Error('Global card not found for player.');
  return row;
}

module.exports = {
  getGlobalCardByPlayerObjectId,
  getPlayerHistory,
  getTopCards,
  calculateAttributes,
};
