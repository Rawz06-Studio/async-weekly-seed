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
  <main class="container mx-auto mt-10 px-4 pb-16 max-w-3xl">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-2 text-primary">
      Archives
    </h1>
    <USeparator class="max-w-xs mx-auto mb-10" />

    <div v-if="archives && archives.length > 0" class="space-y-2">
      <NuxtLink
        v-for="archive in archives"
        :key="archive.id"
        :to="`/archives/${archive.id}`"
        class="block group"
      >
        <UCard class="hover:ring-1 hover:ring-primary/40 transition-all duration-200" :ui="{ body: 'py-4 px-6' }">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <UBadge
                :label="presetName(archive.preset)"
                variant="subtle"
                :class="presetColors(archive.preset).badge"
                class="font-cinzel tracking-widest uppercase"
              />
              <span class="text-sm text-neutral-400">v{{ archive.version }}</span>
            </div>
            <div class="flex items-center gap-6">
              <span class="text-sm text-neutral-400 dark:text-neutral-500">
                {{ finishers(archive.scores) }} / {{ archive.scores.length }} finished
              </span>
              <span class="font-cinzel text-xs tracking-widest uppercase text-neutral-400 dark:text-neutral-600">
                {{ formatDate(archive.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </span>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-primary/50 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-neutral-400 dark:text-neutral-600">No archives yet.</p>
    </div>
  </main>
</template>
