# Wovith

Stage 0.75 is a quality pass over the smallest Wovith runtime with one real read-only connector: Google Calendar events. The synthetic Stage 0 Daily Work Lens remains intact.

## Commands

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

For real Google Calendar testing, copy `.env.example` to `.env.local` and set:

```bash
VITE_GOOGLE_CLIENT_ID=
```

The app includes a **Clear Cached Results** control that removes persisted evaluation/evidence cache for the current lens without deleting the lens definition.

## Stage

See [CURRENT_STAGE.md](CURRENT_STAGE.md), [STAGE_0_DEMO.md](STAGE_0_DEMO.md), [STAGE_0_5_GOOGLE_CALENDAR.md](STAGE_0_5_GOOGLE_CALENDAR.md), [STAGE_0_5_REAL_WORLD_VALIDATION.md](STAGE_0_5_REAL_WORLD_VALIDATION.md), and the canonical contracts in [docs/canonical_docs](docs/canonical_docs).
