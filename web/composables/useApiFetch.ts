export function useApiFetch<T>(path: string, options: Parameters<typeof useFetch>[1] = {}) {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server ? config.apiBase : config.public.apiBase
  return useFetch<T>(path, { baseURL, ...options })
}
