import type { Match, MatchesPerOpponent, Player, Standing, TeamSize, Tournament } from '../types';
import { NHL_TEAMS } from './teams';

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createTournament(names: string[], pool: string[], teamSize: TeamSize = 1, matchesPerOpponent: MatchesPerOpponent = 1): Tournament {
  if (teamSize !== 1 && teamSize !== 2) throw new Error('Välj 1 eller 2 spelare per lag.');
  if (names.length > 16 || names.length < 2 * teamSize || names.length % teamSize !== 0) {
    throw new Error(teamSize === 2 ? 'Två spelare per lag kräver ett jämnt antal personer, minst 4 och högst 16.' : 'Välj 2–16 spelare.');
  }
  const normalized = names.map((n, i) => n.trim() || `Spelare ${i + 1}`);
  if (normalized.some(n => n.length > 40) || new Set(normalized.map(n => n.toLocaleLowerCase('sv'))).size !== names.length) {
    throw new Error('Använd olika spelarnamn med högst 40 tecken.');
  }
  if (new Set(pool).size !== pool.length || pool.some(t => !NHL_TEAMS.includes(t)) || pool.length < names.length / teamSize) {
    throw new Error('Välj minst ett unikt NHL-lag per deltagande lag.');
  }
  const people = teamSize === 2 ? shuffle(normalized) : normalized;
  const teams = shuffle(pool);
  const players: Player[] = Array.from({ length: names.length / teamSize }, (_, id) => {
    const members = people.slice(id * teamSize, (id + 1) * teamSize);
    return { id, name: members.join(' & '), members, team: teams[id] };
  });
  return { version: 1, teamSize, matchesPerOpponent, players, matches: createSchedule(players.map(p => p.id), matchesPerOpponent) };
}

// Circle method: each player appears at most once per round.
// A null participant gives one player a bye when the count is odd.
export function createSchedule(ids: number[], matchesPerOpponent: MatchesPerOpponent = 1): Match[] {
  if (matchesPerOpponent !== 1 && matchesPerOpponent !== 2) throw new Error('Välj 1 eller 2 matcher mot varje lag.');
  let ring: (number | null)[] = shuffle(ids);
  if (ring.length % 2) ring.push(null);
  const rounds: Omit<Match, 'round'>[][] = [];
  for (let r = 0; r < ring.length - 1; r++) {
    const matches: Omit<Match, 'round'>[] = [];
    for (let i = 0; i < ring.length / 2; i++) {
      let a = ring[i];
      let b = ring[ring.length - 1 - i];
      if (a !== null && b !== null) {
        if (Math.random() < 0.5) [a, b] = [b, a];
        matches.push({ a, b, scoreA: null, scoreB: null });
      }
    }
    rounds.push(shuffle(matches));
    ring = [ring[0], ring[ring.length - 1], ...ring.slice(1, -1)];
  }
  const firstLeg = shuffle(rounds).flatMap((round, index) => round.map(m => ({ ...m, round: index + 1 })));
  if (matchesPerOpponent === 1) return firstLeg;
  // Return fixtures reverse home/away; keep each full leg grouped in rounds.
  const returnLeg = firstLeg.map(m => ({ ...m, a: m.b, b: m.a, round: m.round + rounds.length }));
  return [...firstLeg, ...returnLeg];
}

export function calculateStandings(players: Player[], matches: Match[]): Standing[] {
  const rows: Standing[] = players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0, rank: 1 }));
  const byId = new Map(rows.map(p => [p.id, p]));
  for (const m of matches) {
    if (m.scoreA === null || m.scoreB === null) continue;
    const a = byId.get(m.a)!;
    const b = byId.get(m.b)!;
    a.played++; b.played++;
    a.gf += m.scoreA; a.ga += m.scoreB;
    b.gf += m.scoreB; b.ga += m.scoreA;
    if (m.scoreA > m.scoreB) { a.wins++; a.points += 3; b.losses++; }
    else if (m.scoreB > m.scoreA) { b.wins++; b.points += 3; a.losses++; }
    else { a.draws++; b.draws++; a.points++; b.points++; }
  }
  rows.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name, 'sv'));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.rank = prev && row.points === prev.points && row.gf - row.ga === prev.gf - prev.ga && row.gf === prev.gf ? prev.rank : i + 1;
  });
  return rows;
}

export function validScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99;
}

// Treat persisted/imported JSON as untrusted data, including malformed null entries.
export function isTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<Tournament>;
  if (t.version !== 1 || !Array.isArray(t.players) || !Array.isArray(t.matches) || t.players.length < 2 || t.players.length > 16) return false;
  const teamSize = t.teamSize ?? 1;
  const meetings = t.matchesPerOpponent ?? 1;
  if (meetings !== 1 && meetings !== 2) return false;
  if ((teamSize !== 1 && teamSize !== 2) || t.players.length * teamSize > 16) return false;
  const people = new Set<string>();
  const ids = new Set<number>();
  const names = new Set<string>();
  const teams = new Set<string>();
  for (const p of t.players) {
    if (!p || !Number.isInteger(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > (teamSize === 2 ? 83 : 40) || !NHL_TEAMS.includes(p.team)) return false;
    const members = p.members ?? (teamSize === 1 ? [p.name] : []);
    if (!Array.isArray(members) || members.length !== teamSize) return false;
    for (const member of members) {
      if (typeof member !== 'string' || !member.trim() || member.length > 40 || people.has(member.trim().toLocaleLowerCase('sv'))) return false;
      people.add(member.trim().toLocaleLowerCase('sv'));
    }
    if (p.members && p.name !== members.join(' & ')) return false;
    ids.add(p.id); names.add(p.name.trim().toLocaleLowerCase('sv')); teams.add(p.team);
  }
  if (teams.size !== ids.size || names.size !== ids.size || t.matches.length !== ids.size * (ids.size - 1) / 2 * meetings) return false;
  const pairs = new Map<string, number>();
  const directions = new Set<string>();
  const maxRound = (ids.size % 2 === 0 ? ids.size - 1 : ids.size) * meetings;
  for (const m of t.matches) {
    if (!m || !ids.has(m.a) || !ids.has(m.b) || m.a === m.b || !Number.isInteger(m.round) || m.round < 1 || m.round > maxRound) return false;
    if (!(m.scoreA === null && m.scoreB === null) && !(validScore(m.scoreA) && validScore(m.scoreB))) return false;
    const pair = [m.a, m.b].sort((a, b) => a - b).join(':');
    const direction = `${m.a}:${m.b}`;
    if (directions.has(direction)) return false;
    directions.add(direction);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
    if (pairs.get(pair)! > meetings) return false;
  }
  return [...pairs.values()].every(count => count === meetings);
}
