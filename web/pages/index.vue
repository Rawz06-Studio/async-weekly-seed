<script setup lang="ts">
interface Score {
  id: number
  playerName: string
  time: number | null
  comment: string | null
  vodUrl: string | null
  createdAt: string
}

interface Seed {
  id: number
  seedUrl: string
  preset: string
  version: string
  createdAt: string
  scores: Score[]
}

interface LeaderboardWithSeed {
  id: number
  name: string
  enabled: boolean
  seed: Seed | null
}

interface HomeData {
  leaderboards: LeaderboardWithSeed[]
  nextSeedDate: string | null
}

const { data, refresh } = await useApiFetch<HomeData>('/leaderboards/active')

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTabSlot = ref<string>('')

onMounted(() => {
  const lbs = data.value?.leaderboards ?? []
  if (!lbs.length) return
  let stored: number | null = null
  try { stored = parseInt(localStorage.getItem('ootAsyncActiveLb') || '', 10) || null } catch {}
  const active = (stored && lbs.find(l => l.id === stored)) ? stored : lbs[0].id
  activeTabSlot.value = `lb-${active}`
})

watch(activeTabSlot, (val) => {
  const id = Number(val.replace('lb-', ''))
  if (id) try { localStorage.setItem('ootAsyncActiveLb', String(id)) } catch {}
})

const tabItems = computed(() =>
  data.value?.leaderboards.map(lb => ({ label: lb.name, value: `lb-${lb.id}` })) ?? []
)

// ── Submit ────────────────────────────────────────────────────────────────────
const form = reactive({ playerName: '', time: '', vodUrl: '', comment: '', website: '' })
const submitting = ref(false)
const submitError = ref<string | null>(null)
const toast = useToast()
const config = useRuntimeConfig()

async function submitScore(lbId: number) {
  if (!form.playerName.trim()) { submitError.value = 'Player name is required'; return }
  submitting.value = true
  submitError.value = null
  try {
    await $fetch('/scores', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { ...form, leaderboardId: lbId },
    })
    Object.assign(form, { playerName: '', time: '', vodUrl: '', comment: '', website: '' })
    toast.add({ title: 'Time submitted!', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    submitError.value = (err as { data?: { message?: string } })?.data?.message || 'An error occurred'
  } finally {
    submitting.value = false
  }
}

// ── Standings ─────────────────────────────────────────────────────────────────
const standingsModes = reactive<Record<number, 'masked' | 'full'>>({})
const standingsMode = (id: number) => standingsModes[id] || 'masked'
const setStandingsMode = (id: number, mode: 'masked' | 'full') => { standingsModes[id] = mode }

const scoreColumns = [
  { accessorKey: 'rank', header: '#' },
  { accessorKey: 'playerName', header: 'Player' },
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'vod', header: 'VOD' },
  { accessorKey: 'comment', header: 'Comment' },
  { accessorKey: 'submitted', header: 'Submitted' },
]

function scoreRows(scores: Score[]) {
  return scores.map((s, i) => ({ ...s, _rankIndex: i }))
}

function rankClass(score: Score & { _rankIndex: number }, i: number) {
  if (score.time === null) return 'text-neutral-300 dark:text-neutral-700'
  if (i === 0) return 'text-amber-500'
  if (i === 1) return 'text-neutral-400'
  if (i === 2) return 'text-amber-700'
  return 'text-neutral-500'
}

// ── Countdown ─────────────────────────────────────────────────────────────────
const nextSeedDate = computed(() => data.value?.nextSeedDate ?? null)
const { countdown } = useCountdown(nextSeedDate)
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <template v-if="data && data.leaderboards.length">

      <UTabs
        v-if="data.leaderboards.length > 1"
        v-model="activeTabSlot"
        :items="tabItems"
        :content="false"
        class="mb-6"
        :ui="{ list: 'font-cinzel' }"
      />

      <template v-for="lb in data.leaderboards" :key="lb.id">
        <div v-show="!activeTabSlot || activeTabSlot === `lb-${lb.id}` || data.leaderboards.length === 1">

          <!-- Active seed -->
          <UCard v-if="lb.seed" :ui="{ body: 'p-0' }">
            <!-- Seed info -->
            <div class="px-8 pt-10 pb-8">
              <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-8 text-primary">
                Weekly Seed
              </h1>
              <div class="flex flex-wrap justify-center items-center gap-10">
                <div class="text-center">
                  <span class="block text-xs tracking-widest uppercase mb-2 text-neutral-400">Preset</span>
                  <UBadge
                    :label="lb.seed.preset.replace('seed_', '').toUpperCase()"
                    variant="subtle"
                    size="lg"
                    :class="presetColors(lb.seed.preset).badge"
                    class="font-cinzel tracking-widest uppercase"
                  />
                </div>
                <div class="text-center">
                  <span class="block text-xs tracking-widest uppercase mb-1 text-neutral-400">Version</span>
                  <span class="font-cinzel text-2xl font-semibold">{{ lb.seed.version }}</span>
                </div>
                <div class="text-center">
                  <span class="block text-xs tracking-widest uppercase mb-1 text-neutral-400">Generated</span>
                  <span class="font-cinzel text-2xl font-semibold">
                    {{ formatDate(lb.seed.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
                <div v-if="data.nextSeedDate" class="text-center">
                  <span class="block text-xs tracking-widest uppercase mb-1 text-neutral-400">Next Seed</span>
                  <span class="font-cinzel text-2xl font-semibold">
                    {{ formatDate(data.nextSeedDate, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                  <span class="block text-xs mt-1 font-mono tracking-wider text-primary">{{ countdown }}</span>
                </div>
                <UButton
                  :to="lb.seed.seedUrl"
                  target="_blank"
                  label="Download Seed"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-arrow-down-tray"
                  size="lg"
                  class="font-cinzel uppercase tracking-wider"
                />
              </div>
            </div>

            <USeparator class="mx-8" />

            <!-- Submit form -->
            <div class="px-8 py-8">
              <p class="font-cinzel text-sm font-semibold tracking-widest uppercase mb-5 text-primary">
                Submit my time
              </p>

              <UAlert
                v-if="submitError"
                color="error"
                variant="subtle"
                icon="i-heroicons-exclamation-circle"
                :description="submitError"
                class="mb-4"
                :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'ghost', size: 'xs' }"
                @close="submitError = null"
              />

              <form class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" @submit.prevent="submitScore(lb.id)">
                <!-- Honeypot -->
                <input
                  v-model="form.website"
                  type="text"
                  name="website"
                  tabindex="-1"
                  autocomplete="off"
                  aria-hidden="true"
                  style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"
                >
                <UInput v-model="form.playerName" placeholder="Player name" required color="primary" />
                <UInput v-model="form.time" placeholder="Time (ex: 1:23:45 or ff)" :ui="{ base: 'font-mono' }" color="primary" />
                <UInput v-model="form.vodUrl" placeholder="VOD link (optional)" color="primary" />
                <UInput v-model="form.comment" placeholder="Comment (optional)" color="primary" />
                <UButton
                  type="submit"
                  label="Submit Time"
                  color="primary"
                  variant="outline"
                  :loading="submitting"
                  class="lg:col-span-4 font-cinzel uppercase tracking-widest justify-center"
                />
              </form>
            </div>

            <USeparator class="mx-8" />

            <!-- Standings -->
            <div class="px-8 py-8">
              <UAccordion
                :items="[{
                  label: lb.seed.scores.length
                    ? `Weekly Standings (${lb.seed.scores.length} participant${lb.seed.scores.length !== 1 ? 's' : ''})`
                    : 'Weekly Standings',
                  slot: 'standings'
                }]"
                :ui="{ label: 'font-cinzel text-sm font-semibold tracking-widest uppercase text-primary' }"
              >
                <template #standings-body>
                  <template v-if="lb.seed.scores.length">
                    <!-- Mode toggle -->
                    <div class="flex gap-2 mb-4 mt-2">
                      <UButton
                        label="Players only"
                        size="xs"
                        :color="standingsMode(lb.id) === 'masked' ? 'primary' : 'neutral'"
                        :variant="standingsMode(lb.id) === 'masked' ? 'solid' : 'outline'"
                        class="font-cinzel uppercase tracking-widest"
                        @click="setStandingsMode(lb.id, 'masked')"
                      />
                      <UButton
                        label="Full standings"
                        size="xs"
                        :color="standingsMode(lb.id) === 'full' ? 'primary' : 'neutral'"
                        :variant="standingsMode(lb.id) === 'full' ? 'solid' : 'outline'"
                        class="font-cinzel uppercase tracking-widest"
                        @click="setStandingsMode(lb.id, 'full')"
                      />
                    </div>

                    <!-- Masked view -->
                    <div v-if="standingsMode(lb.id) === 'masked'">
                      <p class="text-xs text-neutral-400 italic mb-3">
                        Times are hidden — switch to Full standings to reveal them.
                      </p>
                      <ul class="divide-y divide-neutral-100 dark:divide-neutral-800">
                        <li
                          v-for="score in [...lb.seed.scores].sort((a, b) => a.playerName.localeCompare(b.playerName))"
                          :key="score.id"
                          class="py-3 px-3 font-semibold"
                        >
                          {{ score.playerName }}
                        </li>
                      </ul>
                    </div>

                    <!-- Full standings -->
                    <UTable
                      v-else
                      :data="scoreRows(lb.seed.scores)"
                      :columns="scoreColumns"
                      :ui="{ thead: 'font-cinzel text-xs tracking-widest uppercase' }"
                    >
                      <template #rank-cell="{ row }">
                        <span class="font-cinzel text-sm font-semibold" :class="rankClass(row.original, row.original._rankIndex)">
                          {{ row.original.time === null ? '—' : row.original._rankIndex + 1 }}
                        </span>
                      </template>
                      <template #playerName-cell="{ row }">
                        <span class="font-semibold">{{ row.original.playerName }}</span>
                      </template>
                      <template #time-cell="{ row }">
                        <span class="font-mono text-sm" :class="row.original.time === null ? 'text-red-500 italic' : 'text-primary'">
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
                  </template>

                  <p v-else class="text-center py-10 font-cinzel tracking-wide italic text-neutral-400 dark:text-neutral-600">
                    No times recorded yet — be the first hero!
                  </p>
                </template>
              </UAccordion>
            </div>
          </UCard>

          <!-- No active seed -->
          <div v-else class="text-center py-24 font-cinzel">
            <template v-if="!lb.enabled">
              <p class="text-2xl tracking-wide text-neutral-400 dark:text-neutral-600">{{ lb.name }} is currently on pause.</p>
              <p class="text-sm mt-3 tracking-widest text-neutral-300 dark:text-neutral-700">No new seeds will be generated until re-enabled.</p>
            </template>
            <template v-else>
              <p class="text-2xl tracking-wide text-neutral-400 dark:text-neutral-600">No active seed for {{ lb.name }}.</p>
              <p class="text-sm mt-3 tracking-widest text-neutral-300 dark:text-neutral-700">Come back later, brave adventurer.</p>
            </template>
          </div>
        </div>
      </template>

    </template>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-neutral-400 dark:text-neutral-600">No active seed at the moment.</p>
      <p class="text-sm mt-3 tracking-widest text-neutral-300 dark:text-neutral-700">Come back later, brave adventurer.</p>
    </div>
  </main>
</template>
