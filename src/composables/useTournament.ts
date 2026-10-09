import { computed, ref } from 'vue';
import type { MatchesPerOpponent, TeamSize, Tournament } from '../types';
import { calculateStandings, createTournament, isTournament, validScore } from '../lib/tournament';

const STORAGE_KEY = 'NHL-proffsen-nhl-v1';
export function useTournament() {
  const tournament = ref<Tournament | null>(null);
  const message = ref('');
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isTournament(parsed)) tournament.value = parsed;
      else message.value = 'Den sparade turneringen kunde inte läsas.';
    }
  } catch { message.value = 'Lokala data kunde inte läsas. Du kan ändå spela och exportera resultat.'; }

  const standings = computed(() => tournament.value ? calculateStandings(tournament.value.players, tournament.value.matches) : []);
  const playedCount = computed(() => tournament.value?.matches.filter(m => m.scoreA !== null).length ?? 0);
  const nextMatchIndex = computed(() => tournament.value?.matches.findIndex(m => m.scoreA === null) ?? -1);

  function persist(success: string) {
    try {
      if (tournament.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament.value));
      else localStorage.removeItem(STORAGE_KEY);
      message.value = success;
    } catch { message.value = 'Kunde inte spara lokalt. Exportera turneringen för att behålla resultaten.'; }
  }

  function draw(names: string[], pool: string[], teamSize: TeamSize = 1, matchesPerOpponent: MatchesPerOpponent = 1) {
    let next: Tournament;
    try { next = createTournament(names, pool, teamSize, matchesPerOpponent); }
    catch (error) { message.value = error instanceof Error ? error.message : 'Kunde inte lotta turneringen.'; return; }
    if (tournament.value && !window.confirm('Lotta om? Nuvarande lag, schema och resultat ersätts.')) return;
    tournament.value = next;
    persist('Lottningen är klar. Dags att släppa pucken!');
  }

  function saveResult(index: number, a: unknown, b: unknown) {
    const match = tournament.value?.matches[index];
    if (!match || !validScore(a) || !validScore(b)) { message.value = 'Fyll i två heltal mellan 0 och 99.'; return; }
    match.scoreA = a; match.scoreB = b;
    persist(`Resultat för match ${index + 1} sparat.`);
  }

  function clearResult(index: number) {
    const match = tournament.value?.matches[index];
    if (!match) return;
    match.scoreA = null; match.scoreB = null;
    persist(`Resultat för match ${index + 1} borttaget.`);
  }

  function reset() {
    if (!tournament.value || !window.confirm('Ta bort turneringen och alla resultat?')) return;
    tournament.value = null;
    persist('Turneringen är nollställd.');
  }

  function exportTournament() {
    if (!tournament.value) { message.value = 'Lotta en turnering först.'; return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(tournament.value, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nhl-dagen.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.value = 'Turneringen exporterad.';
  }

  async function importTournament(file: File): Promise<boolean> {
    try {
      if (file.size > 100_000) throw new Error('File too large');
      const data: unknown = JSON.parse(await file.text());
      if (!isTournament(data)) throw new Error('Invalid tournament');
      if (tournament.value && !window.confirm('Ersätta turneringen med den importerade filen?')) return false;
      tournament.value = data;
      persist('Turneringen importerad.');
      return true;
    } catch { message.value = 'Filen är inte en giltig turnering från NHL-dagen.'; return false; }
  }

  return { tournament, message, standings, playedCount, nextMatchIndex, draw, saveResult, clearResult, reset, exportTournament, importTournament };
}
