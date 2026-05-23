export function useAdminAuth() {
  const token = useCookie('admin_token', {
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    path: '/',
  })
  const config = useRuntimeConfig()

  const isAuthenticated = computed(() => !!token.value)

  async function login(password: string): Promise<void> {
    const res = await $fetch<{ token: string }>('/admin/login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { password },
    })
    token.value = res.token
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/admin/logout', {
        baseURL: config.public.apiBase,
        method: 'POST',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      })
    } finally {
      token.value = null
    }
  }

  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return { token, isAuthenticated, login, logout, authHeaders }
}
