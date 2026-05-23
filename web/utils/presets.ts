const COLORS: Record<string, { badge: string; bar: string; text: string }> = {
  seed_s9: {
    badge: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700',
    bar: 'bg-amber-400 dark:bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  seed_tot: {
    badge: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700',
    bar: 'bg-purple-400 dark:bg-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
  },
  seed_mixed: {
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700',
    bar: 'bg-emerald-400 dark:bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  seed_rsl: {
    badge: 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700',
    bar: 'bg-sky-400 dark:bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
  },
}

const FALLBACK = {
  badge: 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  bar: 'bg-gray-400 dark:bg-gray-500',
  text: 'text-gray-600 dark:text-gray-300',
}

export function presetColors(key: string) {
  return COLORS[key] ?? FALLBACK
}
