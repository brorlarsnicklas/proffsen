import { describe, expect, it } from 'vitest';
import { calculateStandings, createSchedule, createTournament, isTournament } from './tournament';
import { NHL_TEAMS } from './teams';

describe('round robin', () => {
  for (let n = 2; n <= 16; n++) {
    it(`gives ${n} players every opponent exactly once`, () => {
      for (let run = 0; run < 20; run++) {
        const matches = createSchedule(Array.from({ length: n }, (_, id) => id));
        expect(matches).toHaveLength(n * (n - 1) / 2);
        const pairs = matches.map(m => [m.a, m.b].sort((a, b) => a - b).join(':'));
        expect(new Set(pairs).size).toBe(matches.length);
        for (const round of new Set(matches.map(m => m.round))) {
          const participants = matches.filter(m => m.round === round).flatMap(m => [m.a, m.b]);
          expect(new Set(participants).size).toBe(participants.length);
        }
      }
    });
  }
});
const players = ['A', 'B', 'C'].map((name, id) => ({ id, name, team: NHL_TEAMS[id] }));
it('counts wins, draws and goals while ignoring unplayed matches', () => {
  const rows = calculateStandings(players, [
    { a: 0, b: 1, round: 1, scoreA: 4, scoreB: 2 },
    { a: 0, b: 2, round: 2, scoreA: 1, scoreB: 1 },
    { a: 1, b: 2, round: 3, scoreA: null, scoreB: null },
  ]);
  expect(rows[0]).toMatchObject({ name: 'A', points: 4, played: 2, wins: 1, draws: 1, gf: 5, ga: 3 });
  expect(rows[1]).toMatchObject({ name: 'C', points: 1, played: 1 });
});
it('updates statistics when a result changes and gives tied players the same rank', () => {
  const matches = [{ a: 0, b: 1, round: 1, scoreA: 2, scoreB: 0 }];
  expect(calculateStandings(players, matches)[0].name).toBe('A');
  matches[0].scoreA = 0; matches[0].scoreB = 3;
  expect(calculateStandings(players, matches)[0]).toMatchObject({ name: 'B', wins: 1, points: 3, gf: 3 });
  expect(calculateStandings(players, []).map(row => row.rank)).toEqual([1, 1, 1]);
});
it('validates JSON and rejects duplicate pairs, incomplete scores and null entries', () => {
  const data = { version: 1, players, matches: createSchedule(players.map(p => p.id)) };
  expect(isTournament(data)).toBe(true);
  expect(isTournament({ ...data, matches: [data.matches[0], data.matches[0], data.matches[2]] })).toBe(false);
  expect(isTournament({ ...data, players: [null, players[1], players[2]] })).toBe(false);
  expect(isTournament({ ...data, matches: [null, ...data.matches.slice(1)] })).toBe(false);
  expect(isTournament({ ...data, matches: [{ ...data.matches[0], scoreA: 1, scoreB: null }, ...data.matches.slice(1)] })).toBe(false);
});

const sixNames = ['Anna', 'Bo', 'Calle', 'Diana', 'Erik', 'Frida'];
it('creates six solo teams and fifteen matches', () => {
  const t = createTournament(sixNames, NHL_TEAMS, 1);
  expect(t.players).toHaveLength(6);
  expect(t.matches).toHaveLength(15);
  expect(t.players.every(p => p.members?.length === 1)).toBe(true);
  expect(isTournament(t)).toBe(true);
});
it('pairs six people into three distinct teams with three matches', () => {
  for (let run = 0; run < 30; run++) {
    const t = createTournament(sixNames, NHL_TEAMS.slice(0, 3), 2);
    expect(t.players).toHaveLength(3);
    expect(t.matches).toHaveLength(3);
    expect(t.players.every(p => p.members?.length === 2)).toBe(true);
    expect(t.players.flatMap(p => p.members ?? []).sort()).toEqual([...sixNames].sort());
    expect(new Set(t.players.map(p => p.team)).size).toBe(3);
    expect(isTournament(JSON.parse(JSON.stringify(t)))).toBe(true);
    t.matches[0].scoreA = 5; t.matches[0].scoreB = 2;
    const winner = calculateStandings(t.players, t.matches)[0];
    expect(winner).toMatchObject({ wins: 1, gf: 5, points: 3 });
    expect(winner.members).toHaveLength(2);
  }
});
it('rejects odd or insufficient participant counts in pairs mode', () => {
  expect(() => createTournament(sixNames.slice(0, 5), NHL_TEAMS, 2)).toThrow();
  expect(() => createTournament(sixNames.slice(0, 2), NHL_TEAMS, 2)).toThrow();
  expect(() => createTournament(sixNames, NHL_TEAMS.slice(0, 2), 2)).toThrow();
});
it('preserves old solo exports and rejects duplicated people in pairs exports', () => {
  expect(isTournament({ version: 1, players, matches: createSchedule([0, 1, 2]) })).toBe(true);
  const t = createTournament(sixNames, NHL_TEAMS, 2);
  t.players[1].members = [...t.players[0].members!];
  t.players[1].name = t.players[1].members.join(' & ');
  expect(isTournament(t)).toBe(false);
});

describe('two meetings per opponent', () => {
  for (let n = 2; n <= 16; n++) {
    it(`gives ${n} teams two meetings and reversed home/away`, () => {
      const matches = createSchedule(Array.from({ length: n }, (_, i) => i), 2);
      expect(matches).toHaveLength(n * (n - 1));
      for (let a = 0; a < n; a++) {
        expect(matches.filter(m => m.a === a || m.b === a)).toHaveLength(2 * (n - 1));
        for (let b = a + 1; b < n; b++) {
          expect(matches.filter(m => m.a === a && m.b === b)).toHaveLength(1);
          expect(matches.filter(m => m.a === b && m.b === a)).toHaveLength(1);
        }
      }
      for (const round of new Set(matches.map(m => m.round))) {
        const ids = matches.filter(m => m.round === round).flatMap(m => [m.a, m.b]);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  }
});
it('persists double fixtures and counts each played meeting in the standings', () => {
  const t = createTournament(sixNames, NHL_TEAMS, 2, 2);
  expect(t.matches).toHaveLength(6);
  expect(isTournament(JSON.parse(JSON.stringify(t)))).toBe(true);
  const first = t.matches[0];
  const second = t.matches.find(m => m.a === first.b && m.b === first.a)!;
  first.scoreA = 4; first.scoreB = 1;
  second.scoreA = 2; second.scoreB = 3;
  const winner = calculateStandings(t.players, t.matches).find(p => p.id === first.a)!;
  expect(winner).toMatchObject({ played: 2, wins: 2, points: 6, gf: 7, ga: 3 });
  const malformed = JSON.parse(JSON.stringify(t));
  malformed.matches[3] = { ...malformed.matches[0] };
  expect(isTournament(malformed)).toBe(false);
  expect(isTournament({ ...t, matchesPerOpponent: 3 })).toBe(false);
});
