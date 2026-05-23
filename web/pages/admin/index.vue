<script setup lang="ts">
definePageMeta({ middleware: 'admin', layout: false })

interface QueueItem {
  id: number
  preset: string
  createdAt: string
}

interface AdminLeaderboard {
  id: number
  name: string
  enabled: boolean
  presetWeights: string
  queue: QueueItem[]
}

interface ScoreWithSeed {
  id: number
  playerName: string
  time: number | null
  comment: string | null
  vodUrl: string | null
  createdAt: string
  seed: {
    id: number
    preset: string
    createdAt: string
    leaderboard: { id: number; name: string } | null
  }
}

const { authHeaders, logout } = useAdminAuth()
const config = useRuntimeConfig()

function api<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}) {
  return $fetch<T>(path, {
    baseURL: config.public.apiBase,
    headers: authHeaders(),
    ...opts,
  })
}

// ── Data ──────────────────────────────────────────────────────────────────────
const leaderboards = ref<AdminLeaderboard[]>([])
const scores = ref<ScoreWithSeed[]>([])
const activeTab = ref<'leaderboards' | 'queue' | 'scores'>('leaderboards')

async function loadLeaderboards() {
  leaderboards.value = await api<AdminLeaderboard[]>('/admin/leaderboards')
}
async function loadScores() {
  scores.value = await api<ScoreWithSeed[]>('/admin/scores')
}

await Promise.all([loadLeaderboards(), loadScores()])

// ── Leaderboard actions ───────────────────────────────────────────────────────
const editingLb = ref<AdminLeaderboard | null>(null)
const editName = ref('')
const editWeights = ref('')
const editEnabled = ref(true)
const lbError = ref<string | null>(null)
const createName = ref('')
const showCreate = ref(false)

function openEdit(lb: AdminLeaderboard) {
  editingLb.value = lb
  editName.value = lb.name
  editEnabled.value = lb.enabled
  editWeights.value = lb.presetWeights
  lbError.value = null
}

function closeEdit() {
  editingLb.value = null
  lbError.value = null
}

async function saveLb() {
  if (!editingLb.value) return
  lbError.value = null
  try {
    JSON.parse(editWeights.value)
  } catch {
    lbError.value = 'Invalid JSON for preset weights'
    return
  }
  try {
    await api(`/admin/leaderboards/${editingLb.value.id}`, {
      method: 'PATCH',
      body: { name: editName.value, enabled: editEnabled.value, presetWeights: editWeights.value },
    })
    await loadLeaderboards()
    closeEdit()
  } catch {
    lbError.value = 'Failed to save'
  }
}

async function toggleEnabled(lb: AdminLeaderboard) {
  await api(`/admin/leaderboards/${lb.id}`, {
    method: 'PATCH',
    body: { enabled: !lb.enabled },
  })
  await loadLeaderboards()
}

async function deleteLb(lb: AdminLeaderboard) {
  if (!confirm(`Delete leaderboard "${lb.name}"? Seeds will be kept but orphaned.`)) return
  await api(`/admin/leaderboards/${lb.id}`, { method: 'DELETE' })
  await loadLeaderboards()
}

async function createLb() {
  if (!createName.value.trim()) return
  await api('/admin/leaderboards', { method: 'POST', body: { name: createName.value.trim() } })
  createName.value = ''
  showCreate.value = false
  await loadLeaderboards()
}

async function generateSeed(lb: AdminLeaderboard) {
  if (!confirm(`Force generate a new seed for "${lb.name}"?`)) return
  await api(`/admin/leaderboards/${lb.id}/generate-seed`, { method: 'POST' })
  alert('Seed generated.')
}

// ── Queue actions ─────────────────────────────────────────────────────────────
async function regenerateQueue(lb: AdminLeaderboard) {
  if (!confirm(`Regenerate queue for "${lb.name}"?`)) return
  await api(`/admin/leaderboards/${lb.id}/queue/regenerate`, { method: 'POST' })
  await loadLeaderboards()
}

async function deleteQueueItem(item: QueueItem) {
  await api(`/admin/queue-items/${item.id}`, { method: 'DELETE' })
  await loadLeaderboards()
}

// ── Score actions ─────────────────────────────────────────────────────────────
const editingScore = ref<ScoreWithSeed | null>(null)
const editScoreTime = ref<string>('')
const editScoreComment = ref('')
const editScoreVod = ref('')

function openScoreEdit(s: ScoreWithSeed) {
  editingScore.value = s
  editScoreTime.value = s.time !== null ? String(s.time) : ''
  editScoreComment.value = s.comment ?? ''
  editScoreVod.value = s.vodUrl ?? ''
}

async function saveScore() {
  if (!editingScore.value) return
  const timeVal = editScoreTime.value.trim()
  await api(`/admin/scores/${editingScore.value.id}`, {
    method: 'PATCH',
    body: {
      time: timeVal === '' ? null : Number(timeVal),
      comment: editScoreComment.value || null,
      vodUrl: editScoreVod.value || null,
    },
  })
  editingScore.value = null
  await loadScores()
}

async function deleteScore(s: ScoreWithSeed) {
  if (!confirm(`Delete score from ${s.playerName}?`)) return
  await api(`/admin/scores/${s.id}`, { method: 'DELETE' })
  await loadScores()
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  await logout()
  await navigateTo('/admin/login')
}

function presetLabel(key: string) {
  return key.replace('seed_', '').toUpperCase()
}

function formatSeconds(s: number | null) {
  if (s === null) return 'FF'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
</script>

<template>
  <div class="min-h-screen bg-[#0d0e1a] text-gray-100 font-sans">

    <!-- Top bar -->
    <nav class="sticky top-0 z-10 bg-black/60 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <span class="font-cinzel text-amber-400 text-sm tracking-widest uppercase font-bold">Admin</span>
      <div class="flex items-center gap-4">
        <NuxtLink to="/" class="font-cinzel text-xs text-gray-500 hover:text-gray-300 tracking-widest uppercase transition-colors">
          ← Site
        </NuxtLink>
        <button
          class="font-cinzel text-xs text-red-400 hover:text-red-300 tracking-widest uppercase transition-colors"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </nav>

    <main class="max-w-5xl mx-auto px-4 py-8">

      <!-- Tabs -->
      <div class="flex gap-2 mb-8 border-b border-gray-800 pb-0">
        <button
          v-for="tab in (['leaderboards', 'queue', 'scores'] as const)"
          :key="tab"
          class="font-cinzel text-xs tracking-widest uppercase px-4 py-2 border-b-2 transition-colors duration-150 -mb-px"
          :class="activeTab === tab
            ? 'border-amber-500 text-amber-400'
            : 'border-transparent text-gray-500 hover:text-gray-300'"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- ── LEADERBOARDS ──────────────────────────────────────────────────── -->
      <section v-if="activeTab === 'leaderboards'" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-cinzel text-sm tracking-widest uppercase text-gray-400">Leaderboards</h2>
          <button
            class="font-cinzel text-xs uppercase tracking-widest px-4 py-2 rounded-lg border border-amber-700 text-amber-400 hover:bg-amber-700/20 transition-colors"
            @click="showCreate = !showCreate"
          >
            + New
          </button>
        </div>

        <!-- Create form -->
        <div v-if="showCreate" class="bg-gray-900/60 border border-gray-700/50 rounded-xl px-5 py-4 flex gap-3 items-center">
          <input
            v-model="createName"
            type="text"
            placeholder="Leaderboard name"
            class="flex-1 rounded-lg px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500 transition-colors"
            @keyup.enter="createLb"
          >
          <button
            class="font-cinzel text-xs uppercase tracking-widest px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-900 transition-colors"
            @click="createLb"
          >
            Create
          </button>
        </div>

        <!-- List -->
        <div
          v-for="lb in leaderboards"
          :key="lb.id"
          class="bg-gray-900/60 border border-gray-700/50 rounded-xl px-5 py-4"
        >
          <!-- View mode -->
          <div v-if="editingLb?.id !== lb.id" class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <span class="font-cinzel text-base font-semibold text-gray-100 truncate">{{ lb.name }}</span>
              <span
                class="font-cinzel text-xs px-2 py-0.5 rounded border"
                :class="lb.enabled
                  ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700'
                  : 'bg-gray-800 text-gray-500 border-gray-700'"
              >
                {{ lb.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                class="font-cinzel text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-amber-600 hover:text-amber-400 transition-colors"
                @click="generateSeed(lb)"
              >
                Force seed
              </button>
              <button
                class="font-cinzel text-xs uppercase tracking-widest px-3 py-1.5 rounded border transition-colors"
                :class="lb.enabled
                  ? 'border-gray-700 text-gray-400 hover:border-red-700 hover:text-red-400'
                  : 'border-gray-700 text-gray-400 hover:border-emerald-700 hover:text-emerald-400'"
                @click="toggleEnabled(lb)"
              >
                {{ lb.enabled ? 'Disable' : 'Enable' }}
              </button>
              <button
                class="font-cinzel text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-amber-600 hover:text-amber-400 transition-colors"
                @click="openEdit(lb)"
              >
                Edit
              </button>
              <button
                class="font-cinzel text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-red-700 hover:text-red-400 transition-colors"
                @click="deleteLb(lb)"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="space-y-3">
            <p v-if="lbError" class="text-sm text-red-400">{{ lbError }}</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1 font-cinzel uppercase tracking-widest">Name</label>
                <input
                  v-model="editName"
                  type="text"
                  class="w-full rounded-lg px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-100 outline-none focus:border-amber-500 transition-colors"
                >
              </div>
              <div class="flex items-center gap-3 mt-5">
                <input id="lb-enabled" v-model="editEnabled" type="checkbox" class="accent-amber-500 w-4 h-4">
                <label for="lb-enabled" class="text-sm text-gray-300">Enabled</label>
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1 font-cinzel uppercase tracking-widest">
                Preset weights (JSON)
              </label>
              <textarea
                v-model="editWeights"
                rows="3"
                class="w-full rounded-lg px-3 py-2 text-sm font-mono bg-gray-800 border border-gray-600 text-gray-100 outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </div>
            <div class="flex gap-2">
              <button
                class="font-cinzel text-xs uppercase tracking-widest px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-900 transition-colors"
                @click="saveLb"
              >
                Save
              </button>
              <button
                class="font-cinzel text-xs uppercase tracking-widest px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                @click="closeEdit"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── QUEUE ─────────────────────────────────────────────────────────── -->
      <section v-if="activeTab === 'queue'" class="space-y-6">
        <div
          v-for="lb in leaderboards"
          :key="lb.id"
          class="bg-gray-900/60 border border-gray-700/50 rounded-xl px-5 py-5"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-cinzel text-sm tracking-widest uppercase text-gray-300">{{ lb.name }}</h3>
            <button
              class="font-cinzel text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-amber-600 hover:text-amber-400 transition-colors"
              @click="regenerateQueue(lb)"
            >
              Regenerate
            </button>
          </div>

          <div v-if="lb.queue.length" class="flex flex-wrap gap-2">
            <div
              v-for="item in lb.queue"
              :key="item.id"
              class="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5"
            >
              <span
                class="font-cinzel text-xs font-bold uppercase px-2 py-0.5 rounded"
                :class="presetColors(item.preset).badge"
              >
                {{ presetLabel(item.preset) }}
              </span>
              <button
                class="text-gray-600 hover:text-red-400 transition-colors leading-none ml-1 text-base"
                title="Remove"
                @click="deleteQueueItem(item)"
              >
                ×
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-gray-600 italic">Queue empty.</p>
        </div>
      </section>

      <!-- ── SCORES ────────────────────────────────────────────────────────── -->
      <section v-if="activeTab === 'scores'">
        <div class="overflow-x-auto bg-gray-900/60 border border-gray-700/50 rounded-xl">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="font-cinzel text-xs tracking-widest uppercase border-b border-gray-700/60 text-gray-500">
                <th class="px-4 py-3">Player</th>
                <th class="px-4 py-3">Time</th>
                <th class="px-4 py-3">Leaderboard</th>
                <th class="px-4 py-3">Preset</th>
                <th class="px-4 py-3">Submitted</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <template v-for="s in scores" :key="s.id">
                <!-- View row -->
                <tr
                  v-if="editingScore?.id !== s.id"
                  class="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors"
                >
                  <td class="px-4 py-3 font-semibold text-gray-200">{{ s.playerName }}</td>
                  <td class="px-4 py-3 font-mono text-amber-300">{{ formatSeconds(s.time) }}</td>
                  <td class="px-4 py-3 text-gray-400">{{ s.seed.leaderboard?.name ?? '—' }}</td>
                  <td class="px-4 py-3">
                    <span class="font-cinzel text-xs px-2 py-0.5 rounded" :class="presetColors(s.seed.preset).badge">
                      {{ presetLabel(s.seed.preset) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {{ new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex gap-2">
                      <button
                        class="font-cinzel text-xs uppercase tracking-widest text-gray-500 hover:text-amber-400 transition-colors"
                        @click="openScoreEdit(s)"
                      >
                        Edit
                      </button>
                      <button
                        class="font-cinzel text-xs uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
                        @click="deleteScore(s)"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Edit row -->
                <tr v-else class="border-b border-amber-800/30 bg-amber-900/5">
                  <td class="px-4 py-3" colspan="4">
                    <div class="flex items-center gap-3 flex-wrap">
                      <input
                        v-model="editScoreTime"
                        type="number"
                        placeholder="Time (seconds)"
                        class="w-36 rounded px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 text-gray-100 outline-none focus:border-amber-500 transition-colors"
                      >
                      <input
                        v-model="editScoreComment"
                        type="text"
                        placeholder="Comment"
                        class="flex-1 min-w-32 rounded px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 text-gray-100 outline-none focus:border-amber-500 transition-colors"
                      >
                      <input
                        v-model="editScoreVod"
                        type="text"
                        placeholder="VOD URL"
                        class="flex-1 min-w-32 rounded px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 text-gray-100 outline-none focus:border-amber-500 transition-colors"
                      >
                    </div>
                  </td>
                  <td class="px-4 py-3" />
                  <td class="px-4 py-3">
                    <div class="flex gap-2">
                      <button
                        class="font-cinzel text-xs uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
                        @click="saveScore"
                      >
                        Save
                      </button>
                      <button
                        class="font-cinzel text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
                        @click="editingScore = null"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="!scores.length">
                <td colspan="6" class="px-4 py-8 text-center text-gray-600 italic">No scores.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </main>
  </div>
</template>
