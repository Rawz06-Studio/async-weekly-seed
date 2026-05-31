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

const scoreColumns = [
  { accessorKey: 'rank', header: '#' },
  { accessorKey: 'playerName', header: 'Player' },
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'vod', header: 'VOD' },
  { accessorKey: 'comment', header: 'Comment' },
  { accessorKey: 'submitted', header: 'Submitted' },
]

const scoreRows = computed(() =>
  seed.value?.scores.map((s, i) => ({
    ...s,
    rank: s.time === null ? null : i + 1,
    _rankIndex: i,
  })) ?? []
)
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <UButton
      to="/archives"
      variant="ghost"
      color="neutral"
      icon="i-heroicons-arrow-left"
      label="Archives"
      size="xs"
      class="font-cinzel tracking-widest uppercase mb-8"
    />

    <div v-if="seed">
      <UCard :ui="{ body: 'p-0' }">
        <!-- Header -->
        <div class="px-8 pt-10 pb-8">
          <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-8 text-primary">
            {{ presetName(seed.preset) }} Archive
          </h1>
          <div class="flex flex-wrap justify-center items-center gap-10">
            <div class="text-center">
              <span class="block text-xs tracking-widest uppercase mb-1 text-neutral-400">Preset</span>
              <UBadge
                :label="presetName(seed.preset)"
                variant="subtle"
                size="lg"
                :class="presetColors(seed.preset).badge"
                class="font-cinzel tracking-widest uppercase"
              />
            </div>
            <div class="text-center">
              <span class="block text-xs tracking-widest uppercase mb-1 text-neutral-400">Version</span>
              <span class="font-cinzel text-2xl font-semibold">{{ seed.version }}</span>
            </div>
            <div class="text-center">
              <span class="block text-xs tracking-widest uppercase mb-1 text-neutral-400">Played</span>
              <span class="font-cinzel text-2xl font-semibold">
                {{ formatDate(seed.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </span>
            </div>
            <UButton
              :to="seed.seedUrl"
              target="_blank"
              label="View Seed"
              color="primary"
              variant="solid"
              icon="i-heroicons-arrow-top-right-on-square"
              class="font-cinzel uppercase tracking-wider"
            />
          </div>
        </div>

        <USeparator class="mx-8" />

        <!-- Standings -->
        <div class="px-8 py-8">
          <p class="font-cinzel text-sm font-semibold tracking-widest uppercase mb-5 text-primary">
            Final Standings
            <span v-if="seed.scores.length" class="font-sans font-normal normal-case tracking-normal text-xs ml-2 text-neutral-400">
              ({{ seed.scores.length }} participant{{ seed.scores.length !== 1 ? 's' : '' }})
            </span>
          </p>

          <UTable
            v-if="seed.scores.length"
            :data="scoreRows"
            :columns="scoreColumns"
            :ui="{ thead: 'font-cinzel text-xs tracking-widest uppercase' }"
          >
            <template #rank-cell="{ row }">
              <span
                class="font-cinzel text-sm font-semibold"
                :class="row.original.time === null ? 'text-neutral-300 dark:text-neutral-700'
                  : row.original._rankIndex === 0 ? 'text-amber-500'
                  : row.original._rankIndex === 1 ? 'text-neutral-400'
                  : row.original._rankIndex === 2 ? 'text-amber-700'
                  : 'text-neutral-500'"
              >
                {{ row.original.rank ?? '—' }}
              </span>
            </template>

            <template #playerName-cell="{ row }">
              <span class="font-semibold">{{ row.original.playerName }}</span>
            </template>

            <template #time-cell="{ row }">
              <span
                class="font-mono text-sm"
                :class="row.original.time === null ? 'text-red-500 italic' : 'text-primary'"
              >
                {{ formatTime(row.original.time) }}
              </span>
            </template>

            <template #vod-cell="{ row }">
              <UButton
                v-if="row.original.vodUrl"
                :to="row.original.vodUrl"
                target="_blank"
                icon="i-heroicons-video-camera"
                color="primary"
                variant="ghost"
                size="xs"
              />
              <span v-else class="text-neutral-300 dark:text-neutral-700">—</span>
            </template>

            <template #comment-cell="{ row }">
              <span class="text-sm italic text-neutral-400">{{ row.original.comment || '—' }}</span>
            </template>

            <template #submitted-cell="{ row }">
              <span class="font-mono text-xs text-neutral-400 whitespace-nowrap">
                {{ formatDate(row.original.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </template>
          </UTable>

          <p v-else class="text-center py-10 font-cinzel tracking-wide italic text-neutral-400 dark:text-neutral-600">
            No times recorded for this seed.
          </p>
        </div>
      </UCard>
    </div>
  </main>
</template>
