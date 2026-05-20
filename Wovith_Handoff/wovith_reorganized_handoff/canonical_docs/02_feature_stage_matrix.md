# 02 — Feature Stage Matrix

**Status:** Canonical  
**Purpose:** preserve Wovith’s original feature ambition while preventing the first build from becoming impossible.

Legend:

- **Build** = actively implement in this stage.
- **Design** = specify and leave room for it, but do not implement broad behavior.
- **Defer** = keep as future idea.
- **Avoid** = do not ship in this form.

## 1. Platform and app shell

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Web app | Build | Build | Build | Build | Build | Build | Primary first surface. |
| Android shell | Defer | Defer | Design/optional | Build if validated | Build | Build | Mobile should wear lenses before building complex lenses. |
| iOS shell | Defer | Defer | Defer | Defer | Design | Build | Do not split attention before web validates. |
| Desktop app | Defer | Defer | Defer | Design | Build optional | Build | Useful for local capture/files later. |
| Browser extension | Defer | Defer | Defer | Design | Build optional | Build | Good for capture and web context; risky for permissions. |
| Widgets/lock screen | Defer | Defer | Defer | Defer | Build optional | Build | Requires notification/cell stability first. |
| Android Auto / CarPlay | Defer | Defer | Defer | Defer | Defer | Design maybe | Not core; only if voice/capture use case is proven. |

## 2. Sources and connectors

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Synthetic source | Build | Build | Keep | Keep | Keep | Keep | Must power tests and demos permanently. |
| Google Calendar read-only | Defer | Build recommended | Build | Build | Build | Build | Best first real connector. |
| Google Drive metadata read-only | Defer | Build optional | Build | Build | Build | Build | Start metadata-first; content explicit. |
| Google Drive content read | Defer | Design | Build if explicit | Build | Build | Build | Requires clear disclosure. |
| Gmail metadata read | Defer | Design | Build | Build | Build | Build | Lower risk than body. |
| Gmail body read | Defer | Defer | Build cautiously | Build | Build | Build | Restricted/sensitive data; strong safety required. |
| Gmail draft create | Defer | Defer | Design / maybe late alpha | Build optional | Build | Build | First reasonable Gmail write. |
| Gmail send/delete/modify | Defer | Defer | Defer | Defer | Design/limited | Build with controls | High compliance and user trust risk. |
| Google Chat | Defer | Defer | Defer | Defer | Build optional | Build | Later Workspace expansion. |
| Slack | Defer | Defer | Defer | Design | Build | Build | Useful but adds OAuth and data risk. |
| Notion | Defer | Defer | Defer | Design | Build | Build | Competitive and useful; avoid becoming Notion clone. |
| GitHub | Defer | Defer | Defer | Design | Build | Build | Good for developer ICP. |
| Microsoft 365 | Defer | Defer | Defer | Design | Build optional | Build | Important for teams, harder auth/admin. |
| Local files | Defer | Defer | Defer | Design | Build optional | Build | Needs desktop/mobile permission model. |
| Web capture | Defer | Defer | Defer | Design | Build | Build | Safer than broad browsing automation. |
| Arbitrary user-added MCP | Defer | Defer | Defer | Defer | Defer/design | Build | Requires trust registry/sandbox/policy. |
| Zapier MCP integration | Defer | Defer | Defer | Design | Build optional | Build | Great breadth; high action-governance need. |

## 3. DSL and authoring

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Typed AST | Build | Build | Build | Build | Build | Build | Source of truth. |
| Canonical DSL serializer | Build | Build | Build | Build | Build | Build | Deterministic and user-visible. |
| Parser | Build | Build | Build | Build | Build | Build | Must round-trip canonical DSL. |
| Static analyzer | Build | Build | Build | Build | Build | Build | Fields, sources, permissions, operators. |
| NL→AST | Defer | Build | Build | Build | Build | Build | Use structured output and validation. |
| DSL free-writing by model | Avoid | Avoid | Avoid | Avoid | Avoid | Avoid | Model should not be the canonical serializer. |
| Aliases/synonyms in parser | Design | Design | Build as leniency | Build | Build | Build | Never generate aliases as canonical output. |
| Multi-cell generation | Defer | Design | Build limited | Build | Build | Build | Useful for onboarding; must show preview. |
| Voice-to-cell | Defer | Defer | Defer/design | Build optional | Build | Build | Speech input is fine; full voice authoring later. |
| Lens-as-prompt export | Defer | Defer | Defer | Defer | Design | Build optional | Useful but exfiltration risk. |

## 4. Runtime and data

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Cell registry | Build | Build | Build | Build | Build | Build | Core. |
| Evaluation scheduler | Build | Build | Build | Build | Build | Build | Core. |
| Fresh/stale/error states | Build | Build | Build | Build | Build | Build | Core trust affordance. |
| Local persistence for lens definitions | Build | Build | Build | Build | Build | Build | Local-first direction. |
| Automerge lens docs | Design/Build if simple | Build | Build | Build | Build | Build | Good for definitions/config. |
| Source cache | Design | Build | Build | Build | Build | Build | Evictable; not ownership claim. |
| Evaluation snapshots | Design | Build evidence tier | Build | Build | Build | Build | Required for trustworthy provenance. |
| Full output snapshots | Defer | Defer | Defer | Design | Build optional | Build | Privacy/storage tradeoff. |
| Sync relay | Defer | Defer | Defer | Build | Build | Build | Do not add before core loop works. |
| E2E sync | Defer | Defer | Defer | Defer | Defer/design | Build | Trust tier; no premature claims. |
| Team sharing | Defer | Defer | Defer | Defer | Design | Build | Needs permission manifest. |

## 5. Renderers

| Renderer | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| `list` | Build | Build | Build | Build | Build | Build | Universal. |
| `count` | Build | Build | Build | Build | Build | Build | Simple metric. |
| `raw` | Build | Build | Build | Build | Build | Build | Debug/inspection. |
| `table` | Build if cheap | Build | Build | Build | Build | Build | Great for inspection. |
| `feed` | Defer | Build optional | Build | Build | Build | Build | Good for updates. |
| `cards` | Defer | Build optional | Build | Build | Build | Build | Good for human-readable items. |
| `timeline` | Defer | Defer/design | Build if Calendar | Build | Build | Build | Depends on Calendar strength. |
| `text` | Defer | Defer | Build optional | Build | Build | Build | Useful for summaries. |
| `chart` | Defer | Defer | Defer | Design | Build | Build | Only if metrics become important. |
| `grid` | Defer | Defer | Defer | Design | Build | Build | Later visual richness. |
| `kanban` | Defer | Defer | Defer | Defer | Design/build read-only | Build | Writes require Action Manifest. |
| `map` | Defer | Defer | Defer | Defer | Defer | Build optional | Low relevance for initial ICP. |
| Custom renderer | Defer | Defer | Defer | Defer | Defer | Build | Needs sandbox/accessibility/security. |

## 6. Provenance, audit, and trust

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Cell-level provenance | Build | Build | Build | Build | Build | Build | Core. |
| Item-level “Why?” | Build fixture | Build | Build | Build | Build | Build | Signature interaction. |
| Evidence snapshots | Design | Build | Build | Build | Build | Build | Prevents false explanations after source changes. |
| Full provenance graph view | Defer | Defer | Defer | Defer | Design | Build | Power-user/compliance. |
| Audit log | Design | Build minimal | Build | Build | Build | Build | Connector/agent/actions. |
| Trust labels | Design | Build | Build | Build | Build | Build | External content, agent output, user-authored. |
| Compliance export | Defer | Defer | Defer | Defer | Design | Build | Trust/team feature. |

## 7. Security and actions

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Taint model | Design | Build | Build | Build | Build | Build | External content cannot instruct tools. |
| Action Manifest type | Design | Design/build | Build | Build | Build | Build | Even before actions, define the object. |
| Read-only actions | Build | Build | Build | Build | Build | Build | Reads are still audited. |
| Draft actions | Defer | Defer | Design | Build optional | Build | Build | First safe write class. |
| Send/delete/destructive actions | Defer | Defer | Defer | Defer | Design gated | Build gated | Irreversible; high risk. |
| Tool approval UI | Defer | Defer | Build for proposals | Build | Build | Build | Required before writes. |
| Undo guarantee | Avoid | Avoid | Avoid | Avoid | Avoid | Avoid | Use compensating actions where available. |
| Prompt injection red-team | Design | Build | Build | Build | Build | Build | Must exist before Gmail body read. |

## 8. Onboarding, discovery, and calibration

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Starter lens templates | Design | Build | Build | Build | Build | Build | Role/use-case based. |
| Guided lens seeding | Defer | Build | Build | Build | Build | Build | Replacement for early “mining.” |
| Inverse lens mining | Defer | Defer | Defer/design | Design | Build opt-in | Build | Keep concept; soften UX. |
| Hidden app/browser scan | Avoid | Avoid | Avoid | Avoid | Avoid | Avoid | Only explicit opt-in narrow discovery later. |
| Pin/hide/mute | Build simple | Build | Build | Build | Build | Build | Calibration core. |
| Implicit calibration | Defer | Defer | Design | Build limited | Build | Build | Avoid surprise filtering. |
| Topic detection | Defer | Defer | Design | Build optional | Build | Build | Must be transparent. |
| Blind-spot lens | Defer | Defer | Defer | Defer/design | Build optional | Build | Powerful but easy to feel judgmental. |

## 9. Agents and budgets

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| Agent-free runtime | Build | Keep | Keep | Keep | Keep | Keep | Runtime must not require LLM. |
| NL authoring model calls | Defer | Build | Build | Build | Build | Build | Validate AST. |
| Agent enrichment | Defer | Defer/design | Build limited | Build | Build | Build | Summaries/classification only early. |
| Budget UI | Defer | Design | Build simple | Build | Build | Build | Necessary if Wovith pays costs. |
| Server-side metering | Defer | Defer | Design | Build | Build | Build | Client-only budget is insufficient. |
| BYOK | Defer | Defer | Defer/design | Build optional | Build | Build | Good for advanced/privacy users. |
| Local models | Defer | Defer | Defer | Design | Build optional | Build | Helps privacy/cost, but UX complexity. |
| Background autonomous agents | Defer | Defer | Defer | Defer | Design gated | Build gated | Only with explicit policies. |

## 10. GTM and business model

| Feature | Stage 0 | Stage 0.5 | Stage 1 | Stage 1.5 | Stage 2 | Stage 3+ | Notes |
|---|---|---|---|---|---|---|---|
| ICP testing | Build | Build | Build | Build | Build | Build | Talk to power users early. |
| Free local-only | Design | Design | Build optional | Build | Build | Build | Strong trust wedge. |
| Paid sync | Defer | Defer | Defer/design | Build | Build | Build | Clear value. |
| Paid agent budget | Defer | Defer | Design | Build | Build | Build | Requires server metering. |
| Trust tier | Defer | Defer | Defer | Defer | Design | Build | E2E/compliance/team. |
| Marketplace revenue | Defer | Defer | Defer | Defer | Defer | Design/build | Much later. |

## 11. Ideas considered harmful unless reframed

These should not return as originally phrased:

1. **Default local app/browser scanning.** Reframe as explicit, opt-in discovery with narrow sources.
2. **“Mining” user-facing language.** Reframe as discovery/starter lens suggestions.
3. **Silent writes.** Reframe as proposed actions with Action Manifest.
4. **Universal undo.** Reframe as audit plus compensating actions where technically possible.
5. **Arbitrary MCP without policy.** Reframe as staged extension trust model.
6. **All renderers in v1.** Reframe as progressive renderer library.
7. **E2E/privacy claims ahead of implementation.** Reframe as precise privacy modes.
8. **Model-generated DSL strings.** Reframe as model-generated typed AST plus deterministic serializer.

## 12. Key implementation consequence

The coding agent should treat “not in this stage” as a hard rule. It may create extension points for later features, but it must not implement broad behavior early.
