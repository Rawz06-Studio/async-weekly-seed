<script setup lang="ts">
interface PresetEntry {
  preset: string
  name: string
  date: string
}

interface Row {
  date: string
  presets: (PresetEntry | null)[]
}

interface LeaderboardCol {
  id: number
  name: string
}

interface UpcomingData {
  leaderboards: LeaderboardCol[]
  rows: Row[]
}

const { data } = await useApiFetch<UpcomingData>('/upcoming')

const clientTz = ref('Europe/Paris')
onMounted(() => { clientTz.value = Intl.DateTimeFormat().resolvedOptions().timeZone })

const PARIS_TZ = 'Europe/Paris'
const QC_TZ = 'America/Montreal'

function formatSeedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: clientTz.value, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTzTime(iso: string, tz: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d)
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  return `${time} ${tzName}`
}

function localTimeLine(iso: string) {
  if (clientTz.value === PARIS_TZ || clientTz.value === QC_TZ) return null
  return formatTzTime(iso, clientTz.value)
}

const tableColumns = computed(() => [
  { accessorKey: 'index', header: '#' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'time', header: 'Time' },
  ...(data.value?.leaderboards ?? []).map(lb => ({ accessorKey: `lb_${lb.id}`, header: lb.name })),
])

const tableRows = computed(() =>
  data.value?.rows.map((row, i) => {
    const entry: Record<string, unknown> = { index: i + 1, _date: row.date, _isNext: i === 0 }
    row.presets.forEach((preset, j) => {
      entry[`lb_${data.value!.leaderboards[j].id}`] = preset
    })
    return entry
  }) ?? []
)
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-2 text-primary">
      Upcoming Seeds
    </h1>
    <p class="font-cinzel text-center text-xs tracking-widest uppercase text-neutral-400 mb-6">
      Presets already drawn for the coming weeks
    </p>
    <USeparator class="max-w-xs mx-auto mb-10" />

    <div v-if="data && data.rows.length > 0" class="max-w-4xl mx-auto space-y-3">
      <UTable
        :data="tableRows"
        :columns="tableColumns"
        :ui="{ thead: 'font-cinzel text-xs tracking-widest uppercase', root: 'rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800' }"
      >
        <!-- Index -->
        <template #index-cell="{ row }">
          <span class="font-cinzel text-xs text-neutral-400">{{ row.original.index }}</span>
        </template>

        <!-- Date -->
        <template #date-cell="{ row }">
          <div class="flex items-center gap-2">
            <span class="font-cinzel text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {{ formatSeedDate(row.original._date as string) }}
            </span>
            <UBadge v-if="row.original._isNext" label="Next" color="primary" variant="subtle" size="xs" class="font-cinzel tracking-widest uppercase" />
          </div>
        </template>

        <!-- Time -->
        <template #time-cell="{ row }">
          <div class="font-cinzel text-xs space-y-0.5">
            <div class="text-neutral-500">{{ formatTzTime(row.original._date as string, PARIS_TZ) }}</div>
            <div class="text-neutral-400 dark:text-neutral-600">{{ formatTzTime(row.original._date as string, QC_TZ) }}</div>
            <div v-if="localTimeLine(row.original._date as string)" class="text-primary/70">
              {{ localTimeLine(row.original._date as string) }}
            </div>
          </div>
        </template>

        <!-- Preset cells (one per leaderboard) -->
        <template v-for="lb in data.leaderboards" :key="lb.id" #[`lb_${lb.id}-cell`]="{ row }">
          <template v-if="row.original[`lb_${lb.id}`]">
            <UBadge
              :label="(row.original[`lb_${lb.id}`] as { name: string }).name"
              variant="subtle"
              :class="presetColors((row.original[`lb_${lb.id}`] as { preset: string }).preset).badge"
              class="font-cinzel tracking-widest uppercase"
            />
          </template>
          <span v-else class="text-neutral-300 dark:text-neutral-700">—</span>
        </template>
      </UTable>

      <UAlert
        color="warning"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        title="Indicative only"
        description="The queue may be regenerated at any time — for instance when a new tournament is announced or settings are updated."
      />

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-heroicons-information-circle"
        description="Presets are pre-drawn using weighted random — the queue refills automatically each week."
        :ui="{ description: 'font-cinzel text-xs tracking-widest uppercase text-center' }"
      />
    </div>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-neutral-400 dark:text-neutral-600">No upcoming seeds scheduled.</p>
    </div>
  </main>
</template>
