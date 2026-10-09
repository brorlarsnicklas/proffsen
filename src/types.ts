export type TeamSize = 1 | 2;
export type MatchesPerOpponent = 1 | 2;
// A tournament entry is one competing team (one or two people).
export interface Player { id: number; name: string; team: string; members?: string[] }
export interface Match { a: number; b: number; round: number; scoreA: number | null; scoreB: number | null }
export interface Tournament { version: 1; teamSize?: TeamSize; matchesPerOpponent?: MatchesPerOpponent; players: Player[]; matches: Match[] }
export interface Standing extends Player { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number; rank: number }
