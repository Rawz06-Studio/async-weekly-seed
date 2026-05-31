<template>
  <div class="min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <nav class="sticky top-0 z-10 backdrop-blur-md bg-amber-50/80 dark:bg-black/50 border-b border-amber-200 dark:border-amber-800/30">
      <div class="container mx-auto px-6 py-3 flex justify-between items-center">
        <UButton
          to="/"
          variant="link"
          color="primary"
          class="font-cinzel text-xl font-bold tracking-widest !p-0"
          label="△ OoTR Async Weekly"
        />
        <div class="flex items-center gap-2">
          <UButton to="/archives" variant="ghost" color="neutral" size="xs" class="font-cinzel tracking-widest uppercase" label="Archives" />
          <UButton to="/rulesets" variant="ghost" color="neutral" size="xs" class="font-cinzel tracking-widest uppercase" label="Rulesets" />
          <UButton to="/upcoming" variant="ghost" color="neutral" size="xs" class="font-cinzel tracking-widest uppercase" label="Upcoming" />
        </div>
      </div>
    </nav>

    <slot />

    <footer class="mt-4 pb-8 text-center">
      <USeparator class="max-w-xs mx-auto mb-6" />
      <p class="font-cinzel text-xs tracking-widest uppercase text-stone-300 dark:text-gray-700">
        &copy; 2026 OoT Randomizer Async Weekly
      </p>
    </footer>
  </div>
</template>
