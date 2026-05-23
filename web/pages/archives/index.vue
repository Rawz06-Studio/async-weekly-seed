<script setup lang="ts">
interface Score {
  id: number
  time: number | null
}

interface Archive {
  id: number
  preset: string
  version: string
  createdAt: string
  scores: Score[]
}

const { data: archives } = await useApiFetch<Archive[]>('/archives')

function presetName(preset: string) {
  return preset.replace('seed_', '').toUpperCase()
}

function finishers(scores: Score[]) {
  return scores.filter(s => s.time !== null).length
}
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-10 text-amber-700 dark:text-amber-400">
      Archives
    </h1>

    <div v-if="archives && archives.length > 0" class="space-y-2">
      <NuxtLink
        v-for="archive in archives"
        :key="archive.id"
        :to="`/archives/${archive.id}`"
        class="flex items-center justify-between px-6 py-4 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-white/80 dark:bg-gray-900/70 hover:border-amber-400 dark:hover:border-amber-600/50 hover:bg-amber-50/80 dark:hover:bg-amber-900/10 transition-all duration-200 group"
      >
        <div class="flex items-center gap-6">
          <span class="font-cinzel text-lg font-semibold text-amber-600 dark:text-amber-300">
            {{ presetName(archive.preset) }}
          </span>
          <span class="text-sm text-stone-400 dark:text-gray-500">
            v{{ archive.version }}
          </span>
        </div>
        <div class="flex items-center gap-6">
          <span class="text-sm text-stone-400 dark:text-gray-500">
            {{ finishers(archive.scores) }} finisher{{ finishers(archive.scores) !== 1 ? 's' : '' }}
            / {{ archive.scores.length }} participant{{ archive.scores.length !== 1 ? 's' : '' }}
          </span>
          <span class="font-cinzel text-xs tracking-widest uppercase text-stone-400 dark:text-gray-600">
            {{ formatDate(archive.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) }}
          </span>
          <svg
            class="w-4 h-4 text-amber-400 dark:text-amber-700 group-hover:translate-x-1 transition-transform duration-200"
            fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-stone-400 dark:text-gray-500">No archives yet.</p>
    </div>
  </main>
</template>
