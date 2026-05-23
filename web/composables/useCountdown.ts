export function useCountdown(target: Ref<string | null | undefined>) {
  const text = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function update() {
    const iso = toValue(target)
    if (!iso) { text.value = ''; return }
    const targetDate = new Date(iso)
    if (isNaN(targetDate.getTime())) { text.value = ''; return }
    const diff = targetDate.getTime() - Date.now()
    if (diff <= 0) { text.value = 'Refresh for new seed!'; return }
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    text.value = d > 0
      ? `in ${d}d ${h}h ${String(m).padStart(2, '0')}m`
      : `in ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
    timer = setTimeout(update, 1000)
  }

  onMounted(() => {
    watchEffect(() => {
      if (timer) clearTimeout(timer)
      update()
    })
  })

  onUnmounted(() => { if (timer) clearTimeout(timer) })

  return { countdown: readonly(text) }
}
