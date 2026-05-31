<script setup lang="ts">
definePageMeta({ layout: false })

const { login, isAuthenticated } = useAdminAuth()
if (isAuthenticated.value) await navigateTo('/admin')

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
  <div class="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
    <div class="w-full max-w-sm">
      <h1 class="font-cinzel text-2xl font-bold text-center tracking-widest uppercase text-primary mb-8">
        Admin
      </h1>
      <UCard>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-circle"
            :description="error"
          />
          <UInput
            v-model="password"
            type="password"
            placeholder="Password"
            autofocus
            required
            color="primary"
            size="lg"
            class="w-full"
          />
          <UButton
            type="submit"
            label="Login"
            color="primary"
            variant="solid"
            :loading="loading"
            class="w-full font-cinzel uppercase tracking-widest justify-center"
            size="lg"
          />
        </form>
      </UCard>
    </div>
  </div>
</template>
