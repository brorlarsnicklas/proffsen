<script setup lang="ts">
import { computed, ref } from 'vue';
import MatchRow from './components/MatchRow.vue';
import { useTournament } from './composables/useTournament';
import { NHL_TEAMS } from './lib/teams';
import type { MatchesPerOpponent, TeamSize } from './types';

const { tournament, standings, message, playedCount, nextMatchIndex, draw, saveResult, clearResult, reset, exportTournament, importTournament } = useTournament();
const matchesPerOpponent = ref<MatchesPerOpponent>(tournament.value?.matchesPerOpponent ?? 1);
const teamSize = ref<TeamSize>(tournament.value?.teamSize ?? 1);
const initialNames = tournament.value?.players.flatMap(p => p.members ?? [p.name]) ?? [];
const count = ref(initialNames.length || 6);
const names = ref<string[]>(Array.from({ length: 16 }, (_, i) => initialNames[i] ?? ''));
const selectedTeams = ref([...NHL_TEAMS]);
const plannedTeamCount = computed(() => Math.floor(count.value / teamSize.value));
const configurationValid = computed(() => count.value >= 2 * teamSize.value && count.value % teamSize.value === 0);
const playerCount = computed(() => tournament.value ? tournament.value.players.length * (tournament.value.teamSize ?? 1) : count.value);
const teamCount = computed(() => tournament.value?.players.length ?? plannedTeamCount.value);
const matchCount = computed(() => tournament.value?.matches.length ?? (configurationValid.value ? plannedTeamCount.value * (plannedTeamCount.value - 1) / 2 * matchesPerOpponent.value : 0));
const nextMatch = computed(() => tournament.value?.matches[nextMatchIndex.value]);
const playerMap = computed(() => new Map(tournament.value?.players.map(p => [p.id, p]) ?? []));
const schedule = computed(() => tournament.value?.matches.map((match, index) => ({ match, index, home: playerMap.value.get(match.a)!, away: playerMap.value.get(match.b)! })) ?? []);
const rounds = computed(() => [...new Set(schedule.value.map(item => item.match.round))].map(round => ({ round, matches: schedule.value.filter(item => item.match.round === round) })));
function changeCount(value: number) { count.value = Math.max(2, Math.min(16, Math.trunc(value) || 6)); }
function countChanged(event: Event) { changeCount(Number((event.target as HTMLInputElement).value)); }
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file && await importTournament(file) && tournament.value) {
    teamSize.value = tournament.value.teamSize ?? 1;
    matchesPerOpponent.value = tournament.value.matchesPerOpponent ?? 1;
    const members = tournament.value.players.flatMap(p => p.members ?? [p.name]);
    count.value = members.length;
    names.value = Array.from({ length: 16 }, (_, i) => members[i] ?? '');
  }
  input.value = '';
}
</script>

<template>
  <header><a class="brand" href="./"><span class="puck">N</span> NHL-proffsen</a><span class="header-note">Sponsored by Celcius</span></header>
  <main>
    <section class="hero">
      <div><p class="eyebrow">Get ready to rumble</p><h1>Öl, Chips & Gött häng.<br><span>En vinnare.</span></h1><p class="intro">Lotta lagen, knäpp burken och släpp pucken.</p></div>
      <div class="rink" aria-hidden="true"><div class="rink-line left"></div><div class="rink-line right"></div><div class="center-line"></div><div class="circle"></div><div class="face f1"></div><div class="face f2"></div><div class="face f3"></div><div class="face f4"></div><div class="rink-title">GAME<br>ON<span>EST. BY PRÖFFS</span></div><div class="rink-puck"></div></div>
    </section>
    <div class="dashboard">
      <aside>
        <section class="panel setup">
          <div class="section-title"><span class="step">01</span><h2>Vilka är med?</h2></div><p class="muted">Välj lagstorlek. Lagkamrater och NHL-lag lottas.</p>
          <form @submit.prevent="draw(names.slice(0, count), selectedTeams, teamSize, matchesPerOpponent)">
            <fieldset class="team-size"><legend>Spelare per lag</legend><label><input v-model="teamSize" type="radio" :value="1" name="team-size"> 1 spelare</label><label><input v-model="teamSize" type="radio" :value="2" name="team-size"> 2 spelare</label></fieldset>
            <fieldset class="team-size"><legend>Matcher mot varje lag</legend><label><input v-model="matchesPerOpponent" type="radio" :value="1" name="meetings"> 1 match</label><label><input v-model="matchesPerOpponent" type="radio" :value="2" name="meetings"> 2 matcher</label></fieldset>
            <label for="count">Antal personer totalt</label>
            <div class="counter"><button type="button" aria-label="Färre spelare" @click="changeCount(count - 1)">−</button><input id="count" type="number" :value="count" min="2" max="16" step="1" required @change="countChanged"><button type="button" aria-label="Fler spelare" @click="changeCount(count + 1)">+</button></div>
            <p v-if="!configurationValid" class="configuration-warning" role="status">Välj ett jämnt antal personer, minst 4, för att spela två per lag.</p>
            <p v-else class="muted">{{ count }} personer → {{ plannedTeamCount }} lag → {{ plannedTeamCount * (plannedTeamCount - 1) / 2 * matchesPerOpponent }} matcher totalt · {{ (plannedTeamCount - 1) * matchesPerOpponent }} per lag</p>
            <div v-for="i in count" :key="i" class="name-row"><label :for="`name-${i}`">{{ String(i).padStart(2, '0') }}</label><input :id="`name-${i}`" v-model="names[i - 1]" maxlength="40" :placeholder="`Spelare ${i}`" :aria-label="`Namn på spelare ${i}`"></div>
            <details><summary>Välj lag i lottningen ({{ selectedTeams.length }})</summary><p class="muted">Avmarkera lag ni inte vill spela med.</p><div id="team-pool"><label v-for="team in NHL_TEAMS" :key="team"><input v-model="selectedTeams" type="checkbox" :value="team">{{ team }}</label></div></details>
            <button class="primary" type="submit" :disabled="!configurationValid">{{ tournament ? 'Lotta om turneringen' : 'Lotta lag & matchschema' }} <span>↗</span></button><p class="fine">2–16 personer · Alla lag möter alla {{ matchesPerOpponent === 1 ? 'en' : 'två' }} gång{{ matchesPerOpponent === 1 ? '' : 'er' }}</p>
          </form>
        </section>
        <section class="panel rules"><p class="eyebrow">SÅ RÄKNAR VI</p><div><strong>3</strong><span>poäng för vinst</span><strong>1</strong><span>för oavgjort</span></div><p class="muted">Tabellen sorteras efter poäng, målskillnad och gjorda mål. Vid fortsatt lika delas placeringen.</p><p class="muted">Spelar ni förlängning? Registrera slutresultatet efter avgörandet.</p></section>
      </aside>
      <div class="main-column">
        <section class="stats" aria-label="Turneringsöversikt"><div><span>SPELARE</span><strong>{{ String(playerCount).padStart(2, '0') }}</strong></div><div><span>LAG</span><strong>{{ teamCount }}</strong></div><div><span>MATCHER</span><strong>{{ matchCount }}</strong></div><div><span>SPELADE</span><strong>{{ String(playedCount).padStart(2, '0') }}</strong></div></section>
        <section class="panel">
          <div class="section-title"><span class="step">02</span><h2>Tabellen</h2><span class="badge">{{ !tournament ? 'VÄNTAR PÅ LOTTNING' : playedCount === matchCount ? 'TURNERINGEN ÄR KLAR' : 'TURNERINGEN ÄR IGÅNG' }}</span></div>
          <div v-if="!tournament" class="empty"><strong>Vem tar hem ligan?</strong>Lägg till spelarna och lotta turneringen för att börja.</div>
          <div v-else class="table-scroll"><table><caption class="fine">Tabell för den aktuella turneringen</caption><thead><tr><th scope="col">#</th><th scope="col">DELTAGARE / NHL-LAG</th><th v-for="column in ['M', 'V', 'O', 'F', 'GM', 'IM', 'MS', 'P']" :key="column" scope="col">{{ column }}</th></tr></thead><tbody><tr v-for="row in standings" :key="row.id" :class="{ leader: row.rank === 1 && playedCount > 0 }"><td>{{ row.rank }}</td><td><strong>{{ row.name }}</strong><small>{{ row.team }}</small></td><td>{{ row.played }}</td><td>{{ row.wins }}</td><td>{{ row.draws }}</td><td>{{ row.losses }}</td><td>{{ row.gf }}</td><td>{{ row.ga }}</td><td>{{ row.gf - row.ga > 0 ? '+' : '' }}{{ row.gf - row.ga }}</td><td>{{ row.points }}</td></tr></tbody></table></div>
          <p class="table-key">M matcher · V vinster · O oavgjorda · F förluster · GM/IM mål · MS målskillnad · P poäng</p>
        </section>
        <section class="panel schedule">
          <div class="section-title"><span class="step">03</span><h2>Matchschema</h2><span v-if="tournament" class="muted">{{ playedCount }} / {{ matchCount }} spelade</span></div>
          <div v-if="!tournament" class="empty">Här dyker alla matcher upp efter lottningen.</div>
          <template v-else>
            <div id="next-match" class="next"><div v-if="nextMatch"><span>NÄSTA MATCH · {{ nextMatchIndex + 1 }}</span><strong>{{ playerMap.get(nextMatch.a)?.name }} <span>vs</span> {{ playerMap.get(nextMatch.b)?.name }}</strong></div><div v-else><span>SLUTSIGNAL</span><strong>Alla matcher spelade. Kolla tabellen för slutplaceringen!</strong></div><b>{{ nextMatch ? '↗' : '✓' }}</b></div>
            <div v-for="round in rounds" :key="round.round"><p class="round-label">OMGÅNG {{ round.round }}</p><MatchRow v-for="item in round.matches" :key="`${item.match.a}-${item.match.b}-${item.index}`" v-bind="item" @save="saveResult" @clear="clearResult" /></div>
          </template>
        </section>
        <div class="tools"><button type="button" @click="exportTournament">↓ Exportera turnering</button><label class="file-label">↑ Importera turnering<input type="file" accept="application/json,.json" @change="importFile"></label><button type="button" @click="reset">Nollställ</button></div>
        <p id="message" role="status" aria-live="polite">{{ message }}</p>
      </div>
    </div>
    <footer><strong>NHL-proffsen</strong><span>Byggd för soffan, rivaliteten och en riktigt bra NHL-dag.</span><span>Inofficiell · Ingen koppling till NHL eller Celcius</span></footer>
  </main>
</template>
