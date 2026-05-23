<template>
  <div class="min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <nav class="sticky top-0 z-10 backdrop-blur-md bg-amber-50/80 dark:bg-black/50 border-b border-amber-200 dark:border-amber-800/30 transition-colors duration-300">
      <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <NuxtLink
          to="/"
          class="font-cinzel text-xl font-bold tracking-widest text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors duration-200"
        >
          △ OoTR Async Weekly
        </NuxtLink>
        <div class="flex items-center gap-6">
          <NuxtLink
            to="/archives"
            class="font-cinzel text-xs tracking-widest uppercase text-stone-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-200"
          >
            Archives
          </NuxtLink>
          <NuxtLink
            to="/rulesets"
            class="font-cinzel text-xs tracking-widest uppercase text-stone-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-200"
          >
            Rulesets
          </NuxtLink>
          <NuxtLink
            to="/upcoming"
            class="font-cinzel text-xs tracking-widest uppercase text-stone-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-200"
          >
            Upcoming
          </NuxtLink>
        </div>
      </div>
    </nav>

    <slot />

    <footer class="mt-4 pb-8 text-center">
      <div class="gold-line max-w-xs mx-auto mb-6" />
      <p class="font-cinzel text-xs tracking-widest uppercase text-stone-300 dark:text-gray-700">
        &copy; 2026 OoT Randomizer Async Weekly
      </p>
    </footer>
  </div>
</template>
