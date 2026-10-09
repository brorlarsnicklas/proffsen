<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Match, Player } from '../types';
const props = defineProps<{ match: Match; home: Player; away: Player; index: number }>();
const emit = defineEmits<{ save: [index: number, a: number | string, b: number | string]; clear: [index: number] }>();
const scoreA = ref<number | string>(props.match.scoreA ?? '');
const scoreB = ref<number | string>(props.match.scoreB ?? '');
watch(() => [props.match.scoreA, props.match.scoreB] as const, ([a, b]) => { scoreA.value = a ?? ''; scoreB.value = b ?? ''; });
</script>
<template>
  <form class="match" :class="{ done: match.scoreA !== null }" @submit.prevent="emit('save', index, scoreA, scoreB)">
    <span class="match-number">{{ String(index + 1).padStart(2, '0') }}</span>
    <div class="competitor">{{ home.name }}<small>{{ home.team }}</small></div>
    <div class="scores">
      <input v-model.number="scoreA" type="number" min="0" max="99" step="1" required :aria-label="`Mål för ${home.name} i match ${index + 1}`">
      <span>–</span>
      <input v-model.number="scoreB" type="number" min="0" max="99" step="1" required :aria-label="`Mål för ${away.name} i match ${index + 1}`">
    </div>
    <div class="competitor away">{{ away.name }}<small>{{ away.team }}</small></div>
    <div class="match-actions"><button class="save" type="submit">{{ match.scoreA === null ? 'Spara' : 'Uppdatera' }}</button><button v-if="match.scoreA !== null" class="clear-score" type="button" :aria-label="`Ta bort resultat för match ${index + 1}`" @click="emit('clear', index)">Rensa</button></div>
  </form>
</template>
