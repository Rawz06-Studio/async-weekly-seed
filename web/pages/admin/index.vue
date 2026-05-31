<script setup lang="ts">
definePageMeta({ middleware: 'admin', layout: false })

interface QueueItem { id: number; preset: string; createdAt: string }
interface AdminLeaderboard { id: number; name: string; enabled: boolean; presetWeights: string; queue: QueueItem[] }
interface ScoreWithSeed {
  id: number; playerName: string; time: number | null; comment: string | null; vodUrl: string | null; createdAt: string
  seed: { id: number; preset: string; createdAt: string; leaderboard: { id: number; name: string } | null }
}

const { authHeaders, logout } = useAdminAuth()
const config = useRuntimeConfig()

function api<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}) {
  return $fetch<T>(path, { baseURL: config.public.apiBase, headers: authHeaders(), ...opts })
}

const leaderboards = ref<AdminLeaderboard[]>([])
const scores = ref<ScoreWithSeed[]>([])

async function loadLeaderboards() { leaderboards.value = await api<AdminLeaderboard[]>('/admin/leaderboards') }
async function loadScores() { scores.value = await api<ScoreWithSeed[]>('/admin/scores') }
await Promise.all([loadLeaderboards(), loadScores()])

const activeTab = ref('leaderboards')
const tabItems = [
  { label: 'Leaderboards', slot: 'leaderboards' as const, value: 'leaderboards' },
  { label: 'Queue', slot: 'queue' as const, value: 'queue' },
  { label: 'Scores', slot: 'scores' as const, value: 'scores' },
]

// ── Leaderboards ──────────────────────────────────────────────────────────────
const showCreate = ref(false)
const createName = ref('')
const editingLb = ref<AdminLeaderboard | null>(null)
const editName = ref(''); const editEnabled = ref(true); const editWeights = ref(''); const lbError = ref<string | null>(null)

function openEdit(lb: AdminLeaderboard) { editingLb.value = lb; editName.value = lb.name; editEnabled.value = lb.enabled; editWeights.value = lb.presetWeights; lbError.value = null }
function closeEdit() { editingLb.value = null; lbError.value = null }

async function createLb() {
  if (!createName.value.trim()) return
  await api('/admin/leaderboards', { method: 'POST', body: { name: createName.value.trim() } })
  createName.value = ''; showCreate.value = false; await loadLeaderboards()
}

async function saveLb() {
  if (!editingLb.value) return
  try { JSON.parse(editWeights.value) } catch { lbError.value = 'Invalid JSON'; return }
  await api(`/admin/leaderboards/${editingLb.value.id}`, { method: 'PATCH', body: { name: editName.value, enabled: editEnabled.value, presetWeights: editWeights.value } })
  closeEdit(); await loadLeaderboards()
}

async function toggleEnabled(lb: AdminLeaderboard) {
  await api(`/admin/leaderboards/${lb.id}`, { method: 'PATCH', body: { enabled: !lb.enabled } }); await loadLeaderboards()
}

async function deleteLb(lb: AdminLeaderboard) {
  if (!confirm(`Delete "${lb.name}"?`)) return
  await api(`/admin/leaderboards/${lb.id}`, { method: 'DELETE' }); await loadLeaderboards()
}

async function generateSeed(lb: AdminLeaderboard) {
  if (!confirm(`Force generate seed for "${lb.name}"?`)) return
  await api(`/admin/leaderboards/${lb.id}/generate-seed`, { method: 'POST' })
  alert('Seed generated.')
}

// ── Queue ─────────────────────────────────────────────────────────────────────
async function regenerateQueue(lb: AdminLeaderboard) {
  if (!confirm(`Regenerate queue for "${lb.name}"?`)) return
  await api(`/admin/leaderboards/${lb.id}/queue/regenerate`, { method: 'POST' }); await loadLeaderboards()
}

async function deleteQueueItem(item: QueueItem) {
  await api(`/admin/queue-items/${item.id}`, { method: 'DELETE' }); await loadLeaderboards()
}

// ── Scores ────────────────────────────────────────────────────────────────────
const editingScore = ref<ScoreWithSeed | null>(null)
const editScoreTime = ref(''); const editScoreComment = ref(''); const editScoreVod = ref('')

function openScoreEdit(s: ScoreWithSeed) { editingScore.value = s; editScoreTime.value = s.time !== null ? String(s.time) : ''; editScoreComment.value = s.comment ?? ''; editScoreVod.value = s.vodUrl ?? '' }

async function saveScore() {
  if (!editingScore.value) return
  const t = editScoreTime.value.trim()
  await api(`/admin/scores/${editingScore.value.id}`, { method: 'PATCH', body: { time: t === '' ? null : Number(t), comment: editScoreComment.value || null, vodUrl: editScoreVod.value || null } })
  editingScore.value = null; await loadScores()
}

async function deleteScore(s: ScoreWithSeed) {
  if (!confirm(`Delete score from ${s.playerName}?`)) return
  await api(`/admin/scores/${s.id}`, { method: 'DELETE' }); await loadScores()
}

async function handleLogout() { await logout(); await navigateTo('/admin/login') }

function presetLabel(key: string) { return key.replace('seed_', '').toUpperCase() }
function fmtSec(s: number | null) {
  if (s === null) return 'FF'
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const scoreColumns = [
  { accessorKey: 'playerName', header: 'Player' },
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'leaderboard', header: 'Leaderboard' },
  { accessorKey: 'preset', header: 'Preset' },
  { accessorKey: 'submitted', header: 'Submitted' },
  { accessorKey: 'actions', header: '' },
]
const scoreRows = computed(() => scores.value.map(s => ({
  ...s,
  leaderboard: s.seed.leaderboard?.name ?? '—',
  preset: s.seed.preset,
  submitted: s.createdAt,
})))
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100">
    <!-- Top bar -->
    <nav class="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
      <span class="font-cinzel text-primary text-sm tracking-widest uppercase font-bold">Admin</span>
      <div class="flex items-center gap-2">
        <UButton to="/" variant="ghost" color="neutral" size="xs" label="← Site" class="font-cinzel tracking-widest uppercase" />
        <UButton variant="ghost" color="error" size="xs" label="Logout" class="font-cinzel tracking-widest uppercase" @click="handleLogout" />
      </div>
    </nav>

    <main class="max-w-5xl mx-auto px-4 py-8">
      <UTabs v-model="activeTab" :items="tabItems" :ui="{ list: 'font-cinzel' }">

        <!-- ── LEADERBOARDS ──────────────────────────────────────────────── -->
        <template #leaderboards>
          <div class="space-y-4 mt-6">
            <div class="flex justify-end">
              <UButton label="+ New leaderboard" color="primary" variant="outline" size="xs" class="font-cinzel tracking-widest uppercase" @click="showCreate = !showCreate" />
            </div>

            <!-- Create -->
            <UCard v-if="showCreate" :ui="{ body: 'p-4' }">
              <div class="flex gap-3">
                <UInput v-model="createName" placeholder="Leaderboard name" color="primary" class="flex-1" @keyup.enter="createLb" />
                <UButton label="Create" color="primary" variant="solid" class="font-cinzel uppercase tracking-widest" @click="createLb" />
              </div>
            </UCard>

            <!-- List -->
            <UCard v-for="lb in leaderboards" :key="lb.id" :ui="{ body: 'p-4' }">
              <!-- View -->
              <div v-if="editingLb?.id !== lb.id" class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <span class="font-cinzel font-semibold text-neutral-100">{{ lb.name }}</span>
                  <UBadge
                    :label="lb.enabled ? 'Enabled' : 'Disabled'"
                    :color="lb.enabled ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <UButton label="Force seed" size="xs" color="neutral" variant="outline" class="font-cinzel uppercase tracking-widest" @click="generateSeed(lb)" />
                  <UButton :label="lb.enabled ? 'Disable' : 'Enable'" size="xs" :color="lb.enabled ? 'error' : 'success'" variant="ghost" class="font-cinzel uppercase tracking-widest" @click="toggleEnabled(lb)" />
                  <UButton label="Edit" size="xs" color="primary" variant="ghost" class="font-cinzel uppercase tracking-widest" @click="openEdit(lb)" />
                  <UButton label="Delete" size="xs" color="error" variant="ghost" class="font-cinzel uppercase tracking-widest" @click="deleteLb(lb)" />
                </div>
              </div>

              <!-- Edit -->
              <div v-else class="space-y-3">
                <UAlert v-if="lbError" color="error" variant="subtle" :description="lbError" />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UInput v-model="editName" placeholder="Name" color="primary" />
                  <UCheckbox v-model="editEnabled" label="Enabled" color="primary" />
                </div>
                <UTextarea v-model="editWeights" placeholder='{"seed_s9": 50}' :rows="3" color="primary" class="font-mono text-sm" />
                <div class="flex gap-2">
                  <UButton label="Save" color="primary" variant="solid" class="font-cinzel uppercase tracking-widest" @click="saveLb" />
                  <UButton label="Cancel" color="neutral" variant="ghost" class="font-cinzel uppercase tracking-widest" @click="closeEdit" />
                </div>
              </div>
            </UCard>
          </div>
        </template>

        <!-- ── QUEUE ──────────────────────────────────────────────────────── -->
        <template #queue>
          <div class="space-y-4 mt-6">
            <UCard v-for="lb in leaderboards" :key="lb.id" :ui="{ body: 'p-5' }">
              <div class="flex items-center justify-between mb-4">
                <span class="font-cinzel text-sm tracking-widest uppercase text-neutral-300">{{ lb.name }}</span>
                <UButton label="Regenerate" size="xs" color="primary" variant="outline" class="font-cinzel uppercase tracking-widest" @click="regenerateQueue(lb)" />
              </div>
              <div v-if="lb.queue.length" class="flex flex-wrap gap-2">
                <div v-for="item in lb.queue" :key="item.id" class="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5">
                  <UBadge
                    :label="presetLabel(item.preset)"
                    variant="subtle"
                    :class="presetColors(item.preset).badge"
                    class="font-cinzel tracking-widest uppercase"
                    size="xs"
                  />
                  <UButton icon="i-heroicons-x-mark" size="xs" color="error" variant="ghost" @click="deleteQueueItem(item)" />
                </div>
              </div>
              <p v-else class="text-sm text-neutral-600 italic">Queue empty.</p>
            </UCard>
          </div>
        </template>

        <!-- ── SCORES ──────────────────────────────────────────────────────── -->
        <template #scores>
          <div class="mt-6">
            <UTable
              :data="scoreRows"
              :columns="scoreColumns"
              :ui="{ thead: 'font-cinzel text-xs tracking-widest uppercase', root: 'rounded-xl overflow-hidden border border-neutral-800' }"
            >
              <template #playerName-cell="{ row }">
                <span class="font-semibold text-neutral-200">{{ row.original.playerName }}</span>
              </template>
              <template #time-cell="{ row }">
                <span class="font-mono" :class="row.original.time === null ? 'text-red-400 italic' : 'text-primary'">
                  {{ fmtSec(row.original.time) }}
                </span>
              </template>
              <template #preset-cell="{ row }">
                <UBadge
                  :label="presetLabel(row.original.preset)"
                  variant="subtle"
                  :class="presetColors(row.original.preset).badge"
                  class="font-cinzel tracking-widest uppercase"
                  size="xs"
                />
              </template>
              <template #submitted-cell="{ row }">
                <span class="font-mono text-xs text-neutral-500">
                  {{ new Date(row.original.submitted).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </template>

              <!-- Edit row inline -->
              <template #actions-cell="{ row }">
                <div v-if="editingScore?.id !== row.original.id" class="flex gap-1">
                  <UButton icon="i-heroicons-pencil-square" size="xs" color="primary" variant="ghost" @click="openScoreEdit(row.original)" />
                  <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="deleteScore(row.original)" />
                </div>
                <div v-else class="flex items-center gap-2 flex-wrap">
                  <UInput v-model="editScoreTime" type="number" placeholder="Seconds" size="xs" color="primary" class="w-28" />
                  <UInput v-model="editScoreComment" placeholder="Comment" size="xs" color="primary" class="w-32" />
                  <UInput v-model="editScoreVod" placeholder="VOD URL" size="xs" color="primary" class="w-40" />
                  <UButton icon="i-heroicons-check" size="xs" color="primary" variant="solid" @click="saveScore" />
                  <UButton icon="i-heroicons-x-mark" size="xs" color="neutral" variant="ghost" @click="editingScore = null" />
                </div>
              </template>
            </UTable>
          </div>
        </template>

      </UTabs>
    </main>
  </div>
</template>
