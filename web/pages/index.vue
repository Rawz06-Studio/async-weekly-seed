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

// ── Active tab ────────────────────────────────────────────────────────────────
const activeLbId = ref<number | null>(null)

onMounted(() => {
  const lbIds = data.value?.leaderboards.map(lb => lb.id) ?? []
  if (!lbIds.length) return
  let stored: number | null = null
  try { stored = parseInt(localStorage.getItem('ootAsyncActiveLb') || '', 10) || null } catch {}
  activeLbId.value = (stored && lbIds.includes(stored)) ? stored : lbIds[0]
})

function switchTab(id: number) {
  activeLbId.value = id
  try { localStorage.setItem('ootAsyncActiveLb', String(id)) } catch {}
}

// ── Submit form ───────────────────────────────────────────────────────────────
const form = reactive({ playerName: '', time: '', vodUrl: '', comment: '' })
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)

const toast = useToast()
const config = useRuntimeConfig()

async function submitScore(lbId: number) {
  if (!form.playerName.trim()) {
    submitError.value = 'Player name is required'
    return
  }
  submitting.value = true
  submitError.value = null
  submitSuccess.value = false
  try {
    await $fetch('/scores', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { ...form, leaderboardId: lbId },
    })
    form.playerName = ''
    form.time = ''
    form.vodUrl = ''
    form.comment = ''
    submitSuccess.value = true
    toast.add({ title: 'Time submitted!', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    const message = (err as { data?: { message?: string } })?.data?.message || 'An error occurred'
    submitError.value = message
  } finally {
    submitting.value = false
  }
}

// ── Standings mode ────────────────────────────────────────────────────────────
const standingsModes = reactive<Record<number, 'masked' | 'full'>>({})
function standingsMode(lbId: number) { return standingsModes[lbId] || 'masked' }
function setStandingsMode(lbId: number, mode: 'masked' | 'full') { standingsModes[lbId] = mode }

// ── Countdown ─────────────────────────────────────────────────────────────────
const nextSeedDate = computed(() => data.value?.nextSeedDate ?? null)
const { countdown } = useCountdown(nextSeedDate)

// ── Helpers ───────────────────────────────────────────────────────────────────
function presetName(preset: string) {
  return preset.replace('seed_', '').toUpperCase()
}

function rankClass(scores: Score[], index: number) {
  const score = scores[index]
  if (score.time === null) return 'text-stone-300 dark:text-gray-700'
  const rank = scores.slice(0, index + 1).filter(s => s.time !== null).length
  if (rank === 1) return 'text-amber-500 dark:text-amber-400'
  if (rank === 2) return 'text-stone-400 dark:text-gray-400'
  if (rank === 3) return 'text-amber-700 dark:text-amber-700'
  return 'text-stone-400 dark:text-gray-600'
}

function rankLabel(scores: Score[], index: number) {
  const score = scores[index]
  if (score.time === null) return '—'
  return String(scores.slice(0, index + 1).filter(s => s.time !== null).length)
}
</script>

<template>
  <main class="container mx-auto mt-10 px-4 pb-16">
    <template v-if="data && data.leaderboards.length > 0">

      <!-- Leaderboard tabs -->
      <div v-if="data.leaderboards.length > 1" class="flex gap-2 mb-6">
        <button
          v-for="lb in data.leaderboards"
          :key="lb.id"
          class="font-cinzel text-xs uppercase tracking-widest px-5 py-2 rounded-lg border transition-all duration-200"
          :class="activeLbId === lb.id
            ? 'bg-amber-500 text-gray-900 border-amber-500'
            : 'border-amber-300 dark:border-amber-800/40 text-amber-600 dark:text-amber-700 hover:border-amber-400 dark:hover:border-amber-700/60'"
          @click="switchTab(lb.id)"
        >
          {{ lb.name }}
        </button>
      </div>

      <!-- One panel per leaderboard -->
      <div
        v-for="lb in data.leaderboards"
        :key="lb.id"
        v-show="activeLbId === lb.id"
      >
        <!-- Active seed -->
        <div
          v-if="lb.seed"
          class="bg-white/80 dark:bg-gray-900/70 border border-amber-200 dark:border-amber-800/30 rounded-xl shadow-xl shadow-amber-100/50 dark:shadow-black/50 overflow-hidden transition-colors duration-300"
        >
          <!-- Seed info -->
          <div class="px-8 pt-10 pb-8">
            <h1 class="font-cinzel text-4xl font-bold text-center tracking-wider mb-8 text-amber-700 dark:text-amber-400">
              Weekly Seed
            </h1>
            <div class="flex flex-wrap justify-center items-center gap-10">
              <div class="text-center">
                <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Preset</span>
                <span class="font-cinzel text-2xl font-semibold text-amber-600 dark:text-amber-300">
                  {{ presetName(lb.seed.preset) }}
                </span>
              </div>
              <div class="text-center">
                <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Version</span>
                <span class="font-cinzel text-2xl font-semibold text-gray-700 dark:text-gray-200">
                  {{ lb.seed.version }}
                </span>
              </div>
              <div class="text-center">
                <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Generated</span>
                <span class="font-cinzel text-2xl font-semibold text-gray-700 dark:text-gray-200">
                  {{ formatDate(lb.seed.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
              <div v-if="data.nextSeedDate" class="text-center">
                <span class="block text-xs tracking-widest uppercase mb-1 text-stone-400 dark:text-gray-500">Next Seed</span>
                <span class="font-cinzel text-2xl font-semibold text-gray-700 dark:text-gray-200">
                  {{ formatDate(data.nextSeedDate, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                </span>
                <span class="block text-xs mt-1 font-mono tracking-wider text-amber-600 dark:text-amber-500">
                  {{ countdown }}
                </span>
              </div>
              <a
                :href="lb.seed.seedUrl"
                target="_blank"
                class="font-cinzel uppercase tracking-wider text-sm font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 px-8 py-3 rounded-lg shadow-md shadow-amber-200 dark:shadow-amber-900/40 transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
              >
                Download Seed
              </a>
            </div>
          </div>

          <div class="gold-line mx-8" />

          <!-- Submit form -->
          <div class="px-8 py-8">
            <h2 class="font-cinzel text-sm font-semibold tracking-widest uppercase mb-5 text-amber-700 dark:text-amber-300">
              Submit my time
            </h2>
            <!-- Error banner -->
            <div
              v-if="submitError"
              class="flex items-start gap-3 rounded-lg border border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-300 mb-4"
            >
              <svg class="mt-px shrink-0 w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
              </svg>
              <span class="flex-1">{{ submitError }}</span>
              <button class="shrink-0 opacity-50 hover:opacity-100 transition-opacity leading-none text-base" @click="submitError = null">&times;</button>
            </div>

            <form
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
              @submit.prevent="submitScore(lb.id)"
            >
              <input
                v-model="form.playerName"
                type="text"
                placeholder="Player name"
                required
                class="rounded-lg px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-stone-400 dark:placeholder-gray-500 outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)] transition-[border-color,box-shadow] duration-200"
              >
              <input
                v-model="form.time"
                type="text"
                placeholder="Time (ex: 1:23:45 or ff)"
                class="rounded-lg px-4 py-3 text-sm font-mono bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-stone-400 dark:placeholder-gray-500 outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)] transition-[border-color,box-shadow] duration-200"
              >
              <input
                v-model="form.vodUrl"
                type="text"
                placeholder="VOD link (optional)"
                class="rounded-lg px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-stone-400 dark:placeholder-gray-500 outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)] transition-[border-color,box-shadow] duration-200"
              >
              <input
                v-model="form.comment"
                type="text"
                placeholder="Comment (optional)"
                class="rounded-lg px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-stone-400 dark:placeholder-gray-500 outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)] transition-[border-color,box-shadow] duration-200"
              >
              <button
                type="submit"
                :disabled="submitting"
                class="lg:col-span-4 font-cinzel uppercase tracking-widest text-sm font-semibold py-3 rounded-lg border border-amber-400 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-gray-900 hover:border-amber-500 dark:hover:bg-amber-500 dark:hover:text-gray-900 dark:hover:border-amber-500 active:bg-amber-600 active:border-amber-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ submitting ? 'Submitting…' : 'Submit Time' }}
              </button>
            </form>
          </div>

          <div class="gold-line mx-8" />

          <!-- Standings -->
          <div class="px-8 py-8">
            <details class="group">
              <summary class="flex justify-between items-center cursor-pointer select-none list-none">
                <h2 class="font-cinzel text-sm font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200">
                  Weekly Standings
                  <template v-if="lb.seed.scores.length > 0">
                    <span class="font-sans font-normal normal-case tracking-normal text-xs ml-2 text-stone-400 dark:text-gray-600">
                      ({{ lb.seed.scores.length }} participant{{ lb.seed.scores.length !== 1 ? 's' : '' }})
                    </span>
                    <span class="group-open:hidden font-sans font-normal normal-case tracking-normal text-xs ml-1 text-stone-400 dark:text-gray-600 italic">
                      — open to see who's in
                    </span>
                  </template>
                </h2>
                <span class="text-amber-500 dark:text-amber-600 transition-transform duration-300 group-open:rotate-180">
                  <svg fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="18">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>

              <template v-if="lb.seed.scores.length > 0">
                <!-- Mode toggle -->
                <div class="mt-5 mb-3 flex gap-2">
                  <button
                    class="font-cinzel text-xs uppercase tracking-widest px-4 py-2 rounded-lg border transition-all duration-200"
                    :class="standingsMode(lb.id) === 'masked'
                      ? 'bg-amber-500 text-gray-900 border-amber-500'
                      : 'border-amber-300 dark:border-amber-800/40 text-amber-600 dark:text-amber-700 hover:border-amber-400 dark:hover:border-amber-700/60'"
                    @click="setStandingsMode(lb.id, 'masked')"
                  >
                    Players only
                  </button>
                  <button
                    class="font-cinzel text-xs uppercase tracking-widest px-4 py-2 rounded-lg border transition-all duration-200"
                    :class="standingsMode(lb.id) === 'full'
                      ? 'bg-amber-500 text-gray-900 border-amber-500'
                      : 'border-amber-300 dark:border-amber-800/40 text-amber-600 dark:text-amber-700 hover:border-amber-400 dark:hover:border-amber-700/60'"
                    @click="setStandingsMode(lb.id, 'full')"
                  >
                    Full standings
                  </button>
                </div>

                <!-- Masked view -->
                <div v-show="standingsMode(lb.id) === 'masked'">
                  <p class="mb-4 text-xs text-stone-400 dark:text-gray-500 italic">
                    Times are hidden — switch to <span class="font-semibold not-italic">Full standings</span> to reveal them.
                  </p>
                  <ul class="divide-y divide-stone-100 dark:divide-gray-800/60">
                    <li
                      v-for="score in [...lb.seed.scores].sort((a, b) => a.playerName.localeCompare(b.playerName))"
                      :key="score.id"
                      class="py-3 px-3 font-semibold text-gray-800 dark:text-gray-100"
                    >
                      {{ score.playerName }}
                    </li>
                  </ul>
                </div>

                <!-- Full standings -->
                <div v-show="standingsMode(lb.id) === 'full'" class="overflow-x-auto">
                  <table class="w-full text-left">
                    <thead>
                      <tr class="font-cinzel text-xs tracking-widest uppercase border-b border-amber-200 dark:border-amber-800/40 text-stone-400 dark:text-gray-500">
                        <th class="pb-3 px-3 w-10">#</th>
                        <th class="pb-3 px-3">Player</th>
                        <th class="pb-3 px-3 text-right">Time</th>
                        <th class="pb-3 px-3 text-center">VOD</th>
                        <th class="pb-3 px-3">Comment</th>
                        <th class="pb-3 px-3 text-right">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(score, i) in lb.seed.scores"
                        :key="score.id"
                        class="border-b border-stone-100 dark:border-gray-800/60 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors duration-150"
                      >
                        <td class="py-3 px-3 font-cinzel text-sm font-semibold" :class="rankClass(lb.seed.scores, i)">
                          {{ rankLabel(lb.seed.scores, i) }}
                        </td>
                        <td class="py-3 px-3 font-semibold text-gray-800 dark:text-gray-100">{{ score.playerName }}</td>
                        <td
                          class="py-3 px-3 text-right font-mono text-sm"
                          :class="score.time === null ? 'text-red-500 dark:text-red-400 italic' : 'text-amber-600 dark:text-amber-300'"
                        >
                          {{ formatTime(score.time) }}
                        </td>
                        <td class="py-3 px-3 text-center">
                          <a
                            v-if="score.vodUrl"
                            :href="score.vodUrl"
                            target="_blank"
                            class="text-amber-500 dark:text-amber-700 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-150 inline-block"
                          >
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .61 0 1.3-.1 2.1-.06.8-.15 1.43-.28 1.9-.13.47-.45.85-.94 1.14-.49.28-1.23.42-2.22.42-1 0-1.83-.02-2.5-.07-.66-.04-1.3-.1-1.92-.16-.62-.06-1.12-.12-1.5-.18-.38-.06-.8-.1-1.26-.1l-1.28.1c-.46 0-.88.04-1.26.1-.38.06-.88.12-1.5-.18.62-.06 1.26-.12 1.92-.16.66-.05 1.5-.07 2.5-.07.99 0 1.73.14 2.22.42.49.29.81.67.94 1.14z" />
                            </svg>
                          </a>
                          <span v-else class="text-stone-200 dark:text-gray-700">—</span>
                        </td>
                        <td class="py-3 px-3 text-sm italic text-stone-400 dark:text-gray-600">{{ score.comment || '—' }}</td>
                        <td class="py-3 px-3 text-right font-mono text-xs text-stone-400 dark:text-gray-600 whitespace-nowrap">
                          {{ formatDate(score.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <div v-else class="mt-5">
                <p class="text-center py-10 font-cinzel tracking-wide italic text-stone-400 dark:text-gray-600">
                  No times recorded yet — be the first hero!
                </p>
              </div>
            </details>
          </div>
        </div>

        <!-- No active seed -->
        <div v-else class="text-center py-24 font-cinzel">
          <template v-if="!lb.enabled">
            <p class="text-2xl tracking-wide text-stone-400 dark:text-gray-500">{{ lb.name }} is currently on pause.</p>
            <p class="text-sm mt-3 tracking-widest text-stone-300 dark:text-gray-700">No new seeds will be generated until this leaderboard is re-enabled.</p>
          </template>
          <template v-else>
            <p class="text-2xl tracking-wide text-stone-400 dark:text-gray-500">No active seed for {{ lb.name }}.</p>
            <p class="text-sm mt-3 tracking-widest text-stone-300 dark:text-gray-700">Come back later, brave adventurer.</p>
          </template>
        </div>
      </div>

    </template>

    <div v-else class="text-center py-24 font-cinzel">
      <p class="text-2xl tracking-wide text-stone-400 dark:text-gray-500">No active seed at the moment.</p>
      <p class="text-sm mt-3 tracking-widest text-stone-300 dark:text-gray-700">Come back later, brave adventurer.</p>
    </div>
  </main>
</template>
