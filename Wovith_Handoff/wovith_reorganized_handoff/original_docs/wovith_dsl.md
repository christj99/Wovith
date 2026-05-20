# The Wovith DSL
### Grammar, semantics, and design rationale

---

## 1. Philosophy

The Wovith DSL is the language in which lens cells are written. It is the single most consequential design artifact in the project — it sets the ceiling on what users can express, the floor on what the natural-language compiler can reliably produce, and the contour of what fluency feels like for the users who eventually live in it.

The design is guided by a single inversion of the usual DSL tradition: **this language is designed for LLM generation first, and for human ergonomics second.** Recent research (Anka, 2025; DSL-Xpert 2.0, 2025) is clear that DSLs optimized for LLM authorship can hit dramatically higher accuracy on multi-step tasks than DSLs optimized for human terseness. The human ergonomics layer is the natural-language editor; the DSL itself can afford to be regular, verbose, and explicit.

This sounds like a compromise. It is not. A regular, verbose DSL is exactly the kind of DSL that rewards fluency: every line reads as a sentence, every cell composes by the same handful of rules, and the grammar that the new user fights against on day one becomes the grammar that the veteran user thinks in by day ninety.

The constraints follow from this:

1. **LLM-hardened.** Verbose keywords, explicit naming, canonical forms, predictable structure. No symbol-heavy shorthand. No optional whitespace ambiguity. No multiple ways to say the same thing.
2. **Regular.** Everything composes through a single pipe operator. Sources become streams; streams flow through filters and transforms; streams terminate in renderers. There is no second composition mechanism.
3. **Reads left-to-right.** A cell expression reads like a sentence: "take this thing, do this to it, do this to it, show it like this." No nested function calls deeper than necessary. No reverse-flow constructs.
4. **Closed at the bottom.** A small set of primitives. A small set of operators. New capabilities come from new sources (via MCP connectors) and new renderers (via plug-ins), not from new core syntax.
5. **Honest about cost.** The DSL exposes the slow/fast distinction syntactically. Agent calls and computer-use look different from in-memory operations. Fluent users learn the cost model by reading.

The working name for the language is **the Wovith DSL** or simply **lens language** in conversation. A pretty name can come later.

---

## 2. The shape of a cell expression

Every cell expression has the same shape:

```
source | step | step | ... | renderer
```

A *source* produces a stream of items. Each *step* transforms the stream — filtering, sorting, grouping, joining, enriching. A *renderer* consumes the final stream and produces a rendered view.

**Two equivalent syntactic forms.** The DSL accepts both:

- **Pipe form** (used in examples below): `drive.files | where ... | sort by ... | show as list`
- **Keyword-prefix form** (used in other Wovith docs): `from drive.files where ... sort by ... show as list`

Both forms parse to the same AST and have identical semantics. The pipe form is more concise; the keyword-prefix form reads more like natural language and is the form the natural-language-to-DSL bridge typically generates. Other Wovith docs (cell runtime, connector UX, onboarding) lean toward the keyword-prefix form in their examples; this doc uses the pipe form for compactness. A user authoring in the inspector can use either; the inspector preserves the form the user typed.

A minimal cell:

```
drive.files | show as list
```

Equivalent in the keyword-prefix form:

```
from drive.files show as list
```

This reads: take everything from Drive, show it as a list. A complete and valid cell, though probably not a useful one.

A more pointed cell:

```
drive.files
  where tag is "invoice" and touched in this_week
  | sort by touched desc
  | show as list
```

This reads as expected. Filter Drive to invoices touched this week, sort newest-first, show as a list.

Indentation and line breaks are optional and stylistic. The same cell on one line:

```
drive.files where tag is "invoice" and touched in this_week | sort by touched desc | show as list
```

Both forms parse identically. The multi-line form is the convention for any cell longer than 60 characters; the single-line form is common in inspector view and in inline mentions.

---

## 3. Sources

A source is the entry point to a cell. It produces a stream of items pulled from somewhere — usually a connected MCP server, occasionally a local context, occasionally a generative source.

Every connected MCP server exposes a namespace. Conventional names follow the connector:

| Source | What it produces |
|---|---|
| `drive.files` | Files from Google Drive |
| `drive.folders` | Folders from Google Drive |
| `gmail.threads` | Email threads |
| `gmail.messages` | Individual messages |
| `gmail.contacts` | Contacts |
| `calendar.events` | Calendar events |
| `slack.messages` | Slack messages across joined channels |
| `slack.channels` | Slack channels |
| `notion.pages` | Notion pages |
| `github.issues` | GitHub issues |
| `github.prs` | GitHub pull requests |
| `web.url(...)` | A specific URL via browser-use |
| `web.search(...)` | A web search |
| `fs.files` | Local filesystem files |
| `local.lenses` | Other lenses you have authored |

Two non-MCP sources also exist:

| Source | What it produces |
|---|---|
| `agent(...)` | A generative source — runs a prompt and yields structured output |
| `value(...)` | An inline literal value (for tests, defaults, examples) |

Sources are streams, not collections. They are evaluated lazily and incrementally. A cell expression that takes the first ten items from `drive.files` does not pull all of Drive — it pulls until it has ten matches.

### Source arguments

Most sources take no arguments and pull from the connected server's default scope. Some take arguments to narrow scope at the source:

```
drive.files in folder "Invoices"
gmail.threads in label "Clients"
calendar.events in calendar "Family"
slack.messages in channel "#design"
```

The `in` keyword is reserved for source-level scoping. It does the same job as `where` (filtering) but at the source level, which can be vastly more efficient when the connector supports server-side filtering.

---

## 4. Filtering: `where`

The `where` step filters a stream. Conditions are formed from comparisons joined with `and`, `or`, `not`.

```
where touched in this_week
where tag is "invoice"
where from is "alex@example.com"
where unread and starred
where not archived
where size > 1.megabyte
```

### Operators

| Operator | Meaning |
|---|---|
| `is` | Equality |
| `is not` | Inequality |
| `in` | Membership in collection or time range |
| `not in` | Not member |
| `contains` | String/list contains |
| `matches` | Regex match |
| `>`, `<`, `>=`, `<=` | Numeric comparison |
| `and`, `or`, `not` | Boolean composition |

`is` and `in` are the workhorses. `=` is intentionally absent — `is` is more readable in English, less ambiguous in LLM generation, and unambiguous in a language that doesn't have variable assignment in expressions.

### Quantifiers

For list-valued fields:

```
where labels contains "Important"
where any recipients is "boss@example.com"
where all attachments are pdf
```

`any` and `all` are explicit quantifiers over list fields.

---

## 5. Transforms

After filtering, the stream can be reshaped through transforms.

### Sort

```
| sort by touched desc
| sort by priority asc, then by name asc
```

Direction is explicit (`asc` or `desc`); no implicit defaults.

### Limit and take

```
| take 10
| limit 50
```

`take` and `limit` are aliases.

### Group

```
| group by client
| group by extract_topic(subject)
```

Grouping produces a stream of groups, where each group has a key and members. Renderers know how to display grouped streams (collapsed sections, color-coded headers, etc.).

### Select

```
| select { title, author, touched }
```

Picks fields. The result is a stream of objects with just those fields. Useful for trimming agent-enrichment cost.

### Map

```
| map { title: subject, days_ago: days_since(received) }
```

Renames and transforms fields. The result is a stream of objects with the new shape.

### Distinct

```
| distinct by url
```

Deduplicates by a key.

### Union, intersect, except

For combining streams:

```
let urgent = gmail.threads where flagged
let today = calendar.events on today

union urgent, today | sort by priority desc | show as feed
```

`union` concatenates and deduplicates. `intersect` keeps only common items. `except` removes from the left what is in the right.

---

## 6. Time

Time is a first-class concept. Most cells filter or sort by it.

### Time keywords

```
now
today
yesterday
tomorrow
this_week
last_week
this_month
last_month
this_year
last_year
```

These resolve at evaluation time, on the user's local clock by default. The lens can override the clock for testing or for explicit time zones.

### Relative offsets

```
days_ago(7)
weeks_ago(2)
months_ago(1)
```

Returns a time. `days_ago(7)` is the moment one week before now.

### Ranges

```
since(date)
until(date)
between(start, end)
in this_week
in last_30_days
```

`in` accepts time keywords or explicit ranges. `since` and `until` take a single bound.

```
where touched in this_week
where touched since days_ago(3)
where touched between weeks_ago(2) and yesterday
```

### Durations

For arithmetic and budgets:

```
1.second, 1.minute, 1.hour, 1.day, 1.week, 1.month, 1.year
2.hours, 30.minutes, 90.seconds
```

These are durations, not times. They participate in arithmetic with times:

```
now + 2.hours
calendar.events where start between now and now + 6.hours
```

---

## 7. Variables and reuse

Within a cell, `let` binds a name to an expression:

```
let recent_emails = gmail.threads where received in this_week
let urgent = recent_emails where flagged

union recent_emails, urgent | sort by received desc | show as feed
```

Variables are scoped to the cell. They do not leak across cells.

For sharing across cells within a lens, the lens-level scope supports definitions:

```
lens "Morning" {
  define starred_clients = contacts where label is "Clients" and starred
  
  cell "Client mail" {
    gmail.threads where from in starred_clients | show as feed
  }
}
```

`define` at the lens level is visible to all cells in the lens. Cells can override with local `let` bindings of the same name if they want a different definition.

---

## 8. Agent calls

Agents are first-class — the DSL exposes them as named operations with clear cost semantics.

### Per-item enrichment: `enrich each with`

```
gmail.threads
  where unread
  | take 10
  | enrich each with agent("summarize in one line as 'summary'")
  | show as feed
```

`enrich each` invokes the agent on every item in the stream, appending the result as a new field. The string argument is the prompt; the prompt may include a directive about output structure (here: a one-line summary named `summary`).

Cells using `enrich each` are tier-2 slow lens slots. The cell's freshness indicator reflects this; the agent calls are visibly in progress.

### Stream-level summary: `summarize with`

```
gmail.threads where received in this_week
  | summarize with agent("write one-paragraph summary of the week's activity")
  | show as card
```

`summarize with` invokes the agent once over the whole stream. The result replaces the stream — the rest of the pipeline operates on the agent's output.

### Generative source: `agent(...)`

```
agent("propose three things I should do today based on my recent email")
  | show as list
```

`agent` as a source returns whatever the agent produces, parsed into structured form when possible.

### Browser-use / computer-use: explicit slow operations

```
web.scrape("https://news.example.com/me/saved")
  | enrich each with agent("extract title, author, key claims as 'enriched'")
  | show as cards
```

`web.scrape`, `web.click`, `web.fill`, `web.extract` are explicit computer-use operations. They are unambiguously slow lens slots in the visual grammar. The DSL doesn't pretend these are fast.

---

## 9. Renderers: `show as`

The final step in any cell is `show as`. The argument is a renderer name; renderers may take options.

### Built-in renderers

| Renderer | Best for |
|---|---|
| `list` | Lists of items with title + optional secondary text |
| `feed` | Chronological streams of activity |
| `cards` | Items with rich preview (image, summary, metadata) |
| `card` | A single item with rich detail |
| `timeline` | Time-ordered events |
| `grid` | Items arranged in a 2D grid (images, photos) |
| `chart` | Data visualization (passes through to chart spec) |
| `table` | Tabular data with columns |
| `kanban` | Items grouped into columns (statuses) |
| `map` | Geographic items |
| `text` | A single text blob (for agent summaries) |
| `count` | Just the count, very large, used as a stat cell |
| `raw` | The raw underlying data, for debugging |

### Renderer options

```
| show as feed { compact: true, group_by: "day" }
| show as cards { thumbnail: from "preview_url", subtitle: from "author" }
| show as timeline { range: this_week, density: dense }
| show as chart { type: line, x: "date", y: "count" }
```

Options are passed as a brace-delimited block. The set of valid options depends on the renderer.

### Polymorphic default

If a cell omits `show as`, Wovith picks a default renderer based on the data shape — lists of items get `list`, chronological items get `feed`, single objects get `card`, lists of dates get `timeline`. The default is visible in the inspector and can be made explicit at any time.

---

## 10. Cell and lens scope

A cell expression lives inside a cell definition; a cell definition lives inside a lens definition. The outer structure looks like this:

```
lens "Morning Brief" {
  rhythm: normal
  refresh_budget: 5.minutes
  
  define starred_clients = contacts where label is "Clients" and starred
  
  cell "What's next" at (0, 0) size (320, 200) {
    calendar.events between now and now + 6.hours
      | sort by start asc
      | show as timeline
  }
  
  cell "Client mail" at (340, 0) size (320, 400) {
    gmail.threads where from in starred_clients and unread
      | take 5
      | show as feed
  }
}
```

### Lens-level options

| Option | Meaning |
|---|---|
| `rhythm` | `calm`, `normal`, or `aggressive` — modulates refresh budgets |
| `refresh_budget` | Default freshness budget for cells |
| `clock` | Time zone override |
| `requires` | List of MCP connectors required for the lens to function |

### Cell-level metadata

| Element | Meaning |
|---|---|
| `cell "<name>"` | Display name |
| `at (x, y)` | Spatial position on the canvas |
| `size (w, h)` | Cell dimensions |
| `pinned: true` | Pin cell across lens swaps |
| `refresh_budget` | Per-cell override |

The spatial coordinates and sizes are not edited by hand in normal use — the canvas UI updates them as the user drags and resizes. They appear in the DSL only when the user looks at the cell in raw form.

---

## 11. The natural-language bridge

The NL editor and the DSL editor are equivalent representations of the same cell. The user can be in either and switch at any time.

### NL → DSL compilation

When the user types or speaks a natural-language description, the compiler produces a DSL expression. The compilation uses a grammar-aware prompting approach: the LLM is given the DSL grammar, known source schemas, and recent canonical examples, then asked to produce a parseable expression.

The compiler operates in three modes:

1. **Confident:** the request maps cleanly to a known pattern. The DSL is produced and the cell renders.
2. **Clarifying:** the request is ambiguous on one specific dimension. The compiler asks one inline question with a sensible default, and proceeds.
3. **Skeptical:** the request seems to want something outside the DSL's capabilities. The compiler produces the best approximation and flags what was approximated.

### DSL → NL summary

In the inspector, every DSL expression has a generated NL summary. The summary updates as the user edits the DSL. The summary is regenerated on demand, cached when the DSL hasn't changed.

The summary is a faithful but compressed representation. For long DSL expressions, the summary captures intent rather than every detail: *"Show invoices from this week, sorted newest first, grouped by client"* — not a literal token-for-token translation.

### Round-trip fidelity

The bridge is bidirectional but not lossless. Most cells round-trip cleanly: the NL summary, when recompiled to DSL, produces an expression equivalent (though possibly not identical) to the original. For cells where round-trip is lossy — custom renderers with complex options, agent prompts with elaborate structure, hand-tuned ranking — the inspector marks the cell as **DSL-primary**, and editing the NL summary prompts the user before overwriting.

---

## 12. Errors and partial evaluation

Cells can fail in three ways:

### Parse error

The DSL expression doesn't parse. The compiler shows the error location and a suggested fix. The cell stays in "draft" state until parsing succeeds.

### Type error

The expression parses but is invalid — `where touched is "invoice"` is a type error (`touched` is a time, not a string). The compiler underlines the offending operator and suggests the correction.

### Evaluation error

The expression is valid but fails at runtime — the connector is down, the agent returned malformed output, the source has no data. The cell renders with a red freshness indicator and shows the error inline.

### Partial evaluation

If a cell has multiple sources and one fails, the rest still render with what they have. The cell's freshness indicator reflects the partial state and the inspector shows which sources contributed.

---

## 13. Extension

The DSL is small at the core. Extension happens through:

### New sources

Any MCP server connected by the user adds a namespace. The Wovith team does not maintain or curate connectors — the registry is public, and source namespaces appear automatically as connectors are connected.

### New renderers

Renderers are plug-ins. Built-ins ship with Wovith; community renderers can be installed and made available to lens expressions via `show as <name>`. Renderers declare what data shape they accept and what options they support.

### Custom enrichment

`enrich each with agent(...)` is the general escape hatch. Anything an LLM can compute over an item can be a step in the pipeline.

### What is intentionally *not* extensible

- The core operators (`where`, `sort by`, `take`, `group by`, `enrich each with`, `show as`) are fixed. Extending the core risks fragmenting fluency.
- The pipe operator `|` is the only composition mechanism. No alternative composition syntax.
- Variable scoping rules are fixed. No global mutable state.

---

## 14. Worked examples

### Example 1: One-line cell

```
gmail.threads where unread | take 10 | show as feed
```

The simplest meaningful cell. Useful as a starter.

### Example 2: Time-aware filtering

```
drive.files
  where tag is "invoice" and touched in this_week
  | sort by touched desc
  | show as list
```

### Example 3: Cross-source union

```
let urgent = gmail.threads where flagged and unread
let calendar_today = calendar.events on today

union urgent, calendar_today
  | sort by priority desc
  | show as feed
```

### Example 4: Agent enrichment

```
gmail.threads
  where from in starred_clients and unread
  | take 10
  | enrich each with agent("summarize the ask in 10 words or less as 'ask'")
  | show as cards { subtitle: from "ask" }
```

### Example 5: Computer-use slow slot

```
web.scrape("https://library.example.com/me/saved")
  where saved_at in last_week
  | enrich each with agent("extract title, author, key claims, reading time as 'meta'")
  | sort by saved_at desc
  | show as cards { subtitle: from "meta.author", footer: from "meta.reading_time" }
```

### Example 6: Stream-level summary

```
gmail.threads where received in this_week
  | summarize with agent("Write a one-paragraph briefing on the week's email themes")
  | show as text
```

### Example 7: The blind-spot lens cell

```
let recent_active = gmail.contacts 
  where last_corresponded_with in months_ago(6) to months_ago(1)

gmail.contacts
  where last_corresponded_with in last_year
  except (gmail.contacts where last_corresponded_with in last_month)
  | sort by last_corresponded_with desc
  | take 5
  | show as cards { subtitle: from "last_message" }
```

People you used to be in regular contact with, who have fallen out of the last month's rhythm.

### Example 8: A full lens

```
lens "Morning Brief" {
  rhythm: normal
  refresh_budget: 5.minutes
  requires: drive, gmail, calendar
  
  define important_people = gmail.contacts where label is "VIP"
  
  cell "Next" at (0, 0) size (480, 200) {
    calendar.events between now and now + 8.hours
      | sort by start asc
      | show as timeline { density: dense }
  }
  
  cell "VIP unread" at (0, 220) size (480, 280) {
    gmail.threads
      where from in important_people and unread
      | take 5
      | enrich each with agent("summarize the ask in 10 words as 'ask'")
      | show as cards { subtitle: from "ask" }
  }
  
  cell "Today's documents" at (500, 0) size (320, 500) {
    drive.files
      where touched on today
      | sort by touched desc
      | take 8
      | show as list
  }
}
```

---

## 15. Anti-patterns

A few things the DSL deliberately makes hard or impossible:

### Side effects in pipelines

The DSL has no `mutate` or `write` operator inside a pipeline. Actions that change state (sending an email, posting a message, modifying a file) live in a separate, action-oriented mini-language — explicitly invoked, explicitly confirmed by the user. A lens reads; actions are deliberate.

### Implicit type coercion

`where touched is "invoice"` does not silently compare a time to a string. It's a type error. The compiler will not auto-coerce.

### Recursive expressions

Cells cannot reference themselves or each other in a way that creates cycles. The runtime detects cycles at compile time and refuses to evaluate.

### Hidden state

There is no global state, no implicit context, no "current user" or "current time zone" that varies invisibly. Time keywords resolve against the lens's clock; everything else is explicit.

---

## 16. Future directions

These are out of scope for v1 but worth designing toward:

### Compound types

User-defined types (a Project, a Person, an Article) that can carry methods and views. This would push Wovith further toward the Smalltalk lineage and toward the Tana supertag model. Worth doing once core fluency is established.

### Inference of let-bindings

If the compiler notices the same sub-expression in multiple cells of a lens, it could suggest hoisting it to a `define` at the lens level. A small affordance with real value for power users.

### Inter-lens references

Currently lenses are isolated. There's a future where one lens can reference another's cells, allowing composition across lenses without overlay. This needs careful design to avoid the cycle problems above.

### Schedule / trigger expressions

Cells today react to data changes. There's a future where cells can react to time triggers, location triggers, or external events — without needing a full workflow engine. Probably implemented as a new top-level operator: `on <trigger>`.

### Probabilistic types and confidence

When an agent enrichment returns a value with uncertainty, the type system could carry that confidence forward and renderers could display it. This matters for the trust grammar but is not v1.

---

## 17. The fluency arc

To close: a sketch of what learning the DSL feels like for the user who eventually becomes fluent in it.

**Week 1.** The user authors via natural language exclusively. The DSL is visible in the inspector but never edited. They notice that the DSL form is structured, predictable, and that it shows what the system did with their request.

**Week 2.** The user encounters a cell where the NL summary almost-but-not-quite captures what they want. They try editing the DSL: change `take 10` to `take 5`. The cell updates. They feel the directness of the change.

**Week 4.** The user authors a cell directly in DSL for the first time, because they can predict what to type. The cell renders. They feel a small lift.

**Week 8.** The user copies a DSL expression from one cell into a new cell and modifies it. They are reusing patterns.

**Week 12.** The user writes a custom cell that does something specific to their work — a join across three sources, with a custom agent prompt, rendered in a way the NL compiler wouldn't have arrived at. They are fluent.

**Week 24.** The user reads someone else's published lens, understands every cell by glancing at the DSL, and forks it. They are thinking in the language.

That's the arc the DSL is designed to support. The work is in making every line of every cell, at every week of that arc, read like a sentence that does what it says.

---

## References

- Anka: A Domain-Specific Language for Reliable LLM Code Generation (Mazrouei, 2025)
- DSL-Xpert 2.0: Enhancing LLM-Driven Code Generation for Domain-Specific Languages (2025)
- NaturalEdit: Code Modification through Direct Interaction with Adaptive Natural Language Representation (Tang et al., 2025)
- LLM-Hardened DSLs for Probabilistic Code Generation in High-Assurance Systems (Mai, 2025)
- Observable Framework — reactive cell composition precedent
- F#, Elixir — pipe operator and pipeline composition lineage
- SQL — declarative filtering and source-level scoping influence
