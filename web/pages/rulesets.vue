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

const tabItems = computed(() =>
  leaderboards.value?.map(lb => ({ label: lb.name, slot: `lb-${lb.id}` as const })) ?? []
)

const PROGRESS_COLORS: Record<string, string> = {
  seed_s9: '[&>div]:bg-amber-500',
  seed_tot: '[&>div]:bg-purple-500',
  seed_mixed: '[&>div]:bg-emerald-500',
  seed_rsl: '[&>div]:bg-sky-500',
}
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16 max-w-3xl">
    <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-2 text-primary">
      Rulesets
    </h1>
    <p class="font-cinzel text-center text-xs tracking-widest uppercase text-neutral-400 mb-6">
      Available presets &amp; their draw probabilities
    </p>
    <USeparator class="max-w-xs mx-auto mb-10" />

    <div v-if="leaderboards">
      <UTabs
        v-if="leaderboards.length > 1"
        :items="tabItems"
        class="mb-8"
        :ui="{ list: 'font-cinzel' }"
      >
        <template v-for="lb in leaderboards" :key="lb.id" #[`lb-${lb.id}`]>
          <div class="space-y-4 mt-6">
            <UCard
              v-for="preset in lb.rulesets"
              :key="preset.key"
              :ui="{ body: 'p-5' }"
            >
              <div class="flex items-center justify-between mb-3">
                <UBadge
                  :label="preset.name"
                  variant="subtle"
                  size="md"
                  :class="presetColors(preset.key).badge"
                  class="font-cinzel tracking-widest uppercase"
                />
                <span class="font-cinzel text-2xl font-bold text-primary">{{ preset.probability }}%</span>
              </div>
              <p class="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 mb-4">
                {{ preset.description }}
              </p>
              <UProgress
                :model-value="preset.probability"
                :class="PROGRESS_COLORS[preset.key]"
                size="xs"
              />
            </UCard>
          </div>
        </template>
      </UTabs>

      <!-- Single leaderboard (no tabs) -->
      <template v-else-if="leaderboards[0]">
        <div class="space-y-4">
          <UCard
            v-for="preset in leaderboards[0].rulesets"
            :key="preset.key"
            :ui="{ body: 'p-5' }"
          >
            <div class="flex items-center justify-between mb-3">
              <UBadge
                :label="preset.name"
                variant="subtle"
                size="md"
                :class="presetColors(preset.key).badge"
                class="font-cinzel tracking-widest uppercase"
              />
              <span class="font-cinzel text-2xl font-bold text-primary">{{ preset.probability }}%</span>
            </div>
            <p class="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 mb-4">
              {{ preset.description }}
            </p>
            <UProgress
              :value="preset.probability"
              :class="PROGRESS_COLORS[preset.key]"
              size="xs"
            />
          </UCard>
        </div>
      </template>

      <UAlert
        class="mt-10"
        color="neutral"
        variant="subtle"
        icon="i-heroicons-information-circle"
        description="A new preset is drawn automatically each week using weighted random selection."
        :ui="{ description: 'font-cinzel text-xs tracking-widest uppercase text-center' }"
      />
    </div>
  </main>
</template>
