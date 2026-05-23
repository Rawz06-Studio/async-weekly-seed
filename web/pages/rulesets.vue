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

const activeTab = ref(0)
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16 max-w-3xl">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-2 text-amber-700 dark:text-amber-400">
      Rulesets
    </h1>
    <p class="font-cinzel text-center text-xs tracking-widest uppercase text-stone-400 dark:text-gray-500 mb-6">
      Available presets &amp; their draw probabilities
    </p>
    <div class="gold-line max-w-xs mx-auto mb-10" />

    <div v-if="leaderboards">
      <!-- Tabs -->
      <div v-if="leaderboards.length > 1" class="flex gap-2 mb-8 overflow-x-auto">
        <button
          v-for="(lb, i) in leaderboards"
          :key="lb.id"
          class="font-cinzel text-xs font-bold tracking-widest uppercase px-5 py-2 rounded-full transition-colors duration-200 whitespace-nowrap"
          :class="activeTab === i
            ? 'bg-amber-600 text-white'
            : 'border border-stone-400 dark:border-gray-600 text-stone-500 dark:text-gray-400 hover:border-amber-500 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400'"
          @click="activeTab = i"
        >
          {{ lb.name }}
        </button>
      </div>

      <!-- Preset cards -->
      <div class="space-y-4">
        <div
          v-for="preset in leaderboards[activeTab]?.rulesets"
          :key="preset.key"
          class="bg-white/5 dark:bg-gray-900/60 border border-stone-200 dark:border-gray-700/50 rounded-xl px-6 py-5"
        >
          <div class="flex items-center justify-between mb-3">
            <span
              class="font-cinzel text-xs font-bold tracking-widest uppercase px-3 py-1 rounded"
              :class="presetColors(preset.key).badge"
            >
              {{ preset.name }}
            </span>
            <span class="font-cinzel text-2xl font-bold text-amber-400">
              {{ preset.probability }}%
            </span>
          </div>
          <p class="text-sm leading-relaxed text-stone-500 dark:text-gray-400 mb-4">
            {{ preset.description }}
          </p>
          <div class="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700/60 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="presetColors(preset.key).bar"
              :style="`width: ${preset.probability}%`"
            />
          </div>
        </div>
      </div>

      <!-- Footer note -->
      <div class="mt-10 border border-stone-200 dark:border-gray-700/40 rounded-xl px-6 py-4">
        <p class="font-cinzel text-xs tracking-widest uppercase text-center text-stone-400 dark:text-gray-600">
          A new preset is drawn automatically each week using weighted random selection.
        </p>
      </div>
    </div>
  </main>
</template>
