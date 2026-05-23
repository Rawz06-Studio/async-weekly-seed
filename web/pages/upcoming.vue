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
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-10 text-amber-700 dark:text-amber-400">
      Upcoming Seeds
    </h1>

    <div v-if="data && data.rows.length > 0" class="bg-white/80 dark:bg-gray-900/70 border border-amber-200 dark:border-amber-800/30 rounded-xl shadow-xl shadow-amber-100/50 dark:shadow-black/50 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="font-cinzel text-xs tracking-widest uppercase border-b border-amber-200 dark:border-amber-800/40 text-stone-400 dark:text-gray-500">
              <th class="px-6 py-4">Date</th>
              <th v-for="lb in data.leaderboards" :key="lb.id" class="px-6 py-4">
                {{ lb.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in data.rows"
              :key="i"
              class="border-b border-stone-100 dark:border-gray-800/60 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors duration-150"
              :class="i === 0 ? 'bg-amber-50/40 dark:bg-amber-900/5' : ''"
            >
              <td class="px-6 py-4">
                <span class="font-cinzel text-sm text-gray-700 dark:text-gray-200">
                  {{ formatDate(row.date, { weekday: 'short', day: 'numeric', month: 'short' }) }}
                </span>
                <span v-if="i === 0" class="ml-2 font-cinzel text-xs text-amber-500 dark:text-amber-400 uppercase tracking-widest">
                  Next
                </span>
              </td>
              <td v-for="(preset, j) in row.presets" :key="j" class="px-6 py-4">
                <span v-if="preset" class="font-cinzel text-sm font-semibold text-amber-600 dark:text-amber-300">
                  {{ preset.name }}
                </span>
                <span v-else class="text-stone-300 dark:text-gray-700">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-stone-400 dark:text-gray-500">No upcoming seeds scheduled.</p>
    </div>
  </main>
</template>
