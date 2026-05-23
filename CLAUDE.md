# async-weekly-seed

Monorepo pnpm — plateforme de seeds hebdomadaires asynchrones (jeu de rando).

## Structure

```
api/   → NestJS 11 + TypeORM + PostgreSQL (port 3000)
web/   → Nuxt 4 + Nuxt UI (port 3001)
```

## Commandes

```bash
# API (depuis api/)
pnpm dev          # watch mode
pnpm test         # unit + e2e
pnpm test:unit
pnpm test:e2e

# Web (depuis web/)
pnpm dev          # port 3001
pnpm build
```

## API — modules

- `seed/` — gestion des seeds hebdomadaires, rotation planifiée (cron)
- `score/` — soumission et validation des scores
- `leaderboard/` — classement
- `discord/` — webhooks de notification
- `admin/` — admin

**Entités TypeORM :** `WeeklySeed`, `Score`, `PresetQueueItem`, `Leaderboard`

DB : PostgreSQL en prod, sql.js en mémoire pour les tests.

## Web — pages

- `/` → seed active
- `/archives` → seeds passées
- `/archives/[id]` → détail seed
- `/upcoming` → prochaine seed
- `/rulesets` → règles

**Composables :** `useApiFetch`, `useCountdown`

## Env (api/.env)

Variables clés : `DATABASE_*`, `PORT`, `SEED_CHANGE_DAY`, `SEED_CHANGE_HOUR`, `SEED_API_URL`, `PRESET_QUEUE_SIZE`, `APP_URL`, `DISCORD_WEBHOOKS`
