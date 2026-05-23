<script setup lang="ts">
interface Score {
  id: number
  playerName: string
  time: number | null
  comment: string | null
  vodUrl: string | null
  createdAt: string
}

interface Archive {
  id: number
  seedUrl: string
  preset: string
  version: string
  createdAt: string
  scores: Score[]
}

const route = useRoute()
const { data: seed } = await useApiFetch<Archive>(`/archives/${route.params.id}`)

function presetName(preset: string) {
  return preset.replace('seed_', '').toUpperCase()
}

let rank = 0
function getRank(score: Score): number | null {
  if (score.time === null) return null
  return ++rank
}

// Reset rank reactively
watchEffect(() => { if (seed.value) rank = 0 })
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <NuxtLink
      to="/archives"
      class="inline-flex items-center gap-2 font-cinzel text-xs tracking-widest uppercase text-stone-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 mb-8"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Archives
    </NuxtLink>

    <div v-if="seed" class="bg-white/80 dark:bg-gray-900/70 border border-amber-200 dark:border-amber-800/30 rounded-xl shadow-xl shadow-amber-100/50 dark:shadow-black/50 overflow-hidden">
      <div class="px-8 pt-10 pb-8">
        <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-8 text-amber-700 dark:text-amber-400">
          {{ presetName(seed.preset) }} Archive
        </h1>
        <div class="flex flex-wrap justify-center items-center gap-10">
          <div class="text-center">
            <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Preset</span>
            <span class="font-cinzel text-2xl font-semibold text-amber-600 dark:text-amber-300">
              {{ presetName(seed.preset) }}
            </span>
          </div>
          <div class="text-center">
            <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Version</span>
            <span class="font-cinzel text-2xl font-semibold text-gray-700 dark:text-gray-200">
              {{ seed.version }}
            </span>
          </div>
          <div class="text-center">
            <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Played</span>
            <span class="font-cinzel text-2xl font-semibold text-gray-700 dark:text-gray-200">
              {{ formatDate(seed.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) }}
            </span>
          </div>
          <a
            :href="seed.seedUrl"
            target="_blank"
            class="font-cinzel uppercase tracking-wider text-sm font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 px-8 py-3 rounded-lg shadow-md transition-all duration-200 hover:-translate-y-px"
          >
            View Seed
          </a>
        </div>
      </div>

      <div class="gold-line mx-8" />

      <div class="px-8 py-8">
        <h2 class="font-cinzel text-sm font-semibold tracking-widest uppercase mb-5 text-amber-700 dark:text-amber-300">
          Final Standings
          <span v-if="seed.scores.length > 0" class="font-sans font-normal normal-case tracking-normal text-xs ml-2 text-stone-400 dark:text-gray-600">
            ({{ seed.scores.length }} participant{{ seed.scores.length !== 1 ? 's' : '' }})
          </span>
        </h2>

        <div v-if="seed.scores.length > 0" class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="font-cinzel text-xs tracking-widest uppercase border-b border-amber-200 dark:border-amber-800/40 text-stone-400 dark:text-gray-500">
                <th class="pb-3 px-3 w-10">#</th>
                <th class="pb-3 px-3">Player</th>
                <th class="pb-3 px-3 text-right">Time</th>
                <th class="pb-3 px-3 text-center">VOD</th>
                <th class="pb-3 px-3">Comment</th>
                <th class="pb-3 px-3 text-right">Submitted</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(score, i) in seed.scores"
                :key="score.id"
                class="border-b border-stone-100 dark:border-gray-800/60 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors duration-150"
              >
                <td
                  class="py-3 px-3 font-cinzel text-sm font-semibold"
                  :class="score.time === null ? 'text-stone-300 dark:text-gray-700'
                    : i === 0 ? 'text-amber-500 dark:text-amber-400'
                    : i === 1 ? 'text-stone-400 dark:text-gray-400'
                    : i === 2 ? 'text-amber-700 dark:text-amber-700'
                    : 'text-stone-400 dark:text-gray-600'"
                >
                  {{ score.time === null ? '—' : i + 1 }}
                </td>
                <td class="py-3 px-3 font-semibold text-gray-800 dark:text-gray-100">{{ score.playerName }}</td>
                <td
                  class="py-3 px-3 text-right font-mono text-sm"
                  :class="score.time === null ? 'text-red-500 dark:text-red-400 italic' : 'text-amber-600 dark:text-amber-300'"
                >
                  {{ formatTime(score.time) }}
                </td>
                <td class="py-3 px-3 text-center">
                  <a
                    v-if="score.vodUrl"
                    :href="score.vodUrl"
                    target="_blank"
                    class="text-amber-500 dark:text-amber-700 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-150 inline-block"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .61 0 1.3-.1 2.1-.06.8-.15 1.43-.28 1.9-.13.47-.45.85-.94 1.14-.49.28-1.23.42-2.22.42-1 0-1.83-.02-2.5-.07-.66-.04-1.3-.1-1.92-.16-.62-.06-1.12-.12-1.5-.18-.38-.06-.8-.1-1.26-.1l-1.28.1c-.46 0-.88.04-1.26.1-.38.06-.88.12-1.5.18-.62.06-1.26.12-1.92.16-.66.05-1.5.07-2.5.07-.99 0-1.73-.14-2.22-.42-.49-.29-.81-.67-.94-1.14-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.61 0-1.3.1-2.1.06-.8.15-1.43.28-1.9.13-.47.45-.85.94-1.14.49-.28 1.23-.42 2.22-.42 1 0 1.83.02 2.5.07.66.04 1.3.1 1.92.16.62.06 1.12.12 1.5.18.38.06.8.1 1.26.1l1.28-.1c.46 0 .88-.04 1.26-.1.38-.06.88-.12 1.5-.18.62-.06 1.26-.12 1.92-.16.66-.05 1.5-.07 2.5-.07.99 0 1.73.14 2.22.42.49.29.81.67.94 1.14z" />
                    </svg>
                  </a>
                  <span v-else class="text-stone-200 dark:text-gray-700">—</span>
                </td>
                <td class="py-3 px-3 text-sm italic text-stone-400 dark:text-gray-600">{{ score.comment || '—' }}</td>
                <td class="py-3 px-3 text-right font-mono text-xs text-stone-400 dark:text-gray-600 whitespace-nowrap">
                  {{ formatDate(score.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="text-center py-10 font-cinzel tracking-wide italic text-stone-400 dark:text-gray-600">
          No times recorded for this seed.
        </p>
      </div>
    </div>
  </main>
</template>
