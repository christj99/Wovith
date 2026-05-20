# Wovith

Stage 0 implements the smallest Wovith runtime: synthetic sources, AST-first canonical DSL, validation, evaluation, built-in renderers, provenance, a Why panel, and local persistence.

## Commands

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

The app includes a **Clear Cached Results** control that removes persisted evaluation/evidence cache for the current lens without deleting the lens definition.

## Stage

See [CURRENT_STAGE.md](CURRENT_STAGE.md), [STAGE_0_DEMO.md](STAGE_0_DEMO.md), and the canonical contracts in [docs/canonical_docs](docs/canonical_docs).
