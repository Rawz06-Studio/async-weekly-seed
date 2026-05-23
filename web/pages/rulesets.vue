<script setup lang="ts">
interface Ruleset {
  key: string
  name: string
  weight: number
  probability: number
  description: string
}

interface LeaderboardWithRulesets {
  id: number
  name: string
  rulesets: Ruleset[]
}

const { data: leaderboards } = await useApiFetch<LeaderboardWithRulesets[]>('/rulesets')
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-10 text-amber-700 dark:text-amber-400">
      Rulesets
    </h1>

    <div v-if="leaderboards" class="space-y-10">
      <div v-for="lb in leaderboards" :key="lb.id">
        <h2 v-if="leaderboards.length > 1" class="font-cinzel text-lg font-semibold tracking-widest uppercase mb-4 text-stone-500 dark:text-gray-400">
          {{ lb.name }}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div
            v-for="preset in lb.rulesets"
            :key="preset.key"
            class="bg-white/80 dark:bg-gray-900/70 border border-amber-200 dark:border-amber-800/30 rounded-xl px-6 py-5 shadow-sm"
          >
            <div class="flex items-start justify-between mb-3">
              <span class="font-cinzel text-xl font-bold text-amber-600 dark:text-amber-300">
                {{ preset.name }}
              </span>
              <span class="font-cinzel text-sm font-semibold text-stone-400 dark:text-gray-500">
                {{ preset.probability }}%
              </span>
            </div>
            <p class="text-sm leading-relaxed text-stone-500 dark:text-gray-400">
              {{ preset.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
