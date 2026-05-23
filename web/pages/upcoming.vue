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
const isClient = ref(false)

onMounted(() => {
  clientTz.value = Intl.DateTimeFormat().resolvedOptions().timeZone
  isClient.value = true
})

function formatSeedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: clientTz.value,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTzTime(iso: string, tz: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  // Get short timezone name (e.g. CEST, EDT)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d)
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? tz
  return `${time} ${tzName}`
}

// Show local time if different from Paris, always show Paris + Montreal
const PARIS_TZ = 'Europe/Paris'
const QC_TZ = 'America/Montreal'

function showLocalLine(iso: string): string | null {
  if (!isClient.value) return null
  if (clientTz.value === PARIS_TZ || clientTz.value === QC_TZ) return null
  return formatTzTime(iso, clientTz.value)
}
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-2 text-amber-700 dark:text-amber-400">
      Upcoming Seeds
    </h1>
    <p class="font-cinzel text-center text-xs tracking-widest uppercase text-stone-400 dark:text-gray-500 mb-6">
      Presets already drawn for the coming weeks
    </p>
    <div class="gold-line max-w-xs mx-auto mb-10" />

    <div
      v-if="data && data.rows.length > 0"
      class="bg-white/5 dark:bg-gray-900/60 border border-stone-200 dark:border-gray-700/50 rounded-xl shadow-xl overflow-hidden max-w-4xl mx-auto"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="font-cinzel text-xs tracking-widest uppercase border-b border-stone-200 dark:border-gray-700/60 text-stone-400 dark:text-gray-500">
              <th class="px-4 py-4 w-8 text-center">#</th>
              <th class="px-4 py-4">Date</th>
              <th class="px-4 py-4 text-stone-400/60 dark:text-gray-600">Time</th>
              <th
                v-for="lb in data.leaderboards"
                :key="lb.id"
                class="px-4 py-4"
              >
                {{ lb.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in data.rows"
              :key="i"
              class="border-b border-stone-100 dark:border-gray-800/50 hover:bg-amber-50/20 dark:hover:bg-amber-900/5 transition-colors duration-150"
            >
              <!-- Index -->
              <td class="px-4 py-4 text-center">
                <span class="font-cinzel text-xs text-stone-300 dark:text-gray-600">{{ i + 1 }}</span>
              </td>

              <!-- Date -->
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <span class="font-cinzel text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {{ formatSeedDate(row.date) }}
                  </span>
                  <span
                    v-if="i === 0"
                    class="font-cinzel text-xs text-amber-500 dark:text-amber-400 uppercase tracking-widest"
                  >
                    Next
                  </span>
                </div>
              </td>

              <!-- Time (Paris + QC + local if different) -->
              <td class="px-4 py-4">
                <div class="font-cinzel text-xs text-stone-400 dark:text-gray-500 space-y-0.5">
                  <div>{{ formatTzTime(row.date, PARIS_TZ) }}</div>
                  <div class="text-stone-300 dark:text-gray-600">{{ formatTzTime(row.date, QC_TZ) }}</div>
                  <div v-if="showLocalLine(row.date)" class="text-amber-500/70 dark:text-amber-400/50">
                    {{ showLocalLine(row.date) }}
                  </div>
                </div>
              </td>

              <!-- Preset badges per leaderboard -->
              <td
                v-for="(preset, j) in row.presets"
                :key="j"
                class="px-4 py-4"
              >
                <span
                  v-if="preset"
                  class="font-cinzel text-xs font-bold tracking-widest uppercase px-3 py-1 rounded"
                  :class="presetColors(preset.preset).badge"
                >
                  {{ preset.name }}
                </span>
                <span v-else class="text-stone-300 dark:text-gray-700">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Warning note -->
    <div
      v-if="data && data.rows.length > 0"
      class="mt-4 max-w-4xl mx-auto border border-amber-800/40 bg-amber-900/10 rounded-xl px-5 py-4 flex gap-3 items-start"
    >
      <span class="text-amber-500 mt-0.5 shrink-0">⚠</span>
      <p class="text-sm text-amber-600 dark:text-amber-400">
        These presets are <strong>indicative only</strong>. The queue may be regenerated at any time — for instance when a new tournament is announced or settings are updated.
      </p>
    </div>

    <!-- Footer note -->
    <div
      v-if="data && data.rows.length > 0"
      class="mt-3 max-w-4xl mx-auto border border-stone-200 dark:border-gray-700/40 rounded-xl px-6 py-4"
    >
      <p class="font-cinzel text-xs tracking-widest uppercase text-center text-stone-400 dark:text-gray-600">
        Presets are pre-drawn using weighted random — the queue refills automatically each week.
      </p>
    </div>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-stone-400 dark:text-gray-500">No upcoming seeds scheduled.</p>
    </div>
  </main>
</template>
