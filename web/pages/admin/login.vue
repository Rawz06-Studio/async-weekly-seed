<script setup lang="ts">
definePageMeta({ layout: false })

const { login, isAuthenticated } = useAdminAuth()

if (isAuthenticated.value) {
  await navigateTo('/admin')
}

const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function handleLogin() {
  error.value = null
  loading.value = true
  try {
    await login(password.value)
    await navigateTo('/admin')
  } catch {
    error.value = 'Invalid password'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#0d0e1a] px-4">
    <div class="w-full max-w-sm">
      <h1 class="font-cinzel text-2xl font-bold text-center tracking-widest uppercase text-amber-400 mb-8">
        Admin
      </h1>

      <form
        class="bg-gray-900/60 border border-gray-700/50 rounded-xl px-8 py-8 space-y-4"
        @submit.prevent="handleLogin"
      >
        <div
          v-if="error"
          class="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3"
        >
          {{ error }}
        </div>

        <input
          v-model="password"
          type="password"
          placeholder="Password"
          autofocus
          required
          class="w-full rounded-lg px-4 py-3 text-sm bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] transition-[border-color,box-shadow] duration-200"
        >

        <button
          type="submit"
          :disabled="loading"
          class="w-full font-cinzel uppercase tracking-widest text-sm font-semibold py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Logging in…' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>
