# Wovith Cell Renderer Spec
### Visual grammar, dispatch rules, and the built-in renderer library

---

## 1. The polymorphic rendering principle

A Wovith cell's expression produces a stream of items. The job of the renderer is to take that stream and turn it into a visible surface on the canvas. Renderers are the bridge between the data the user wrote a cell to retrieve and the experience of looking at it.

The core principle: **the renderer is determined by the shape of the data, not by the type of the cell.** A cell is not "a list cell" or "a chart cell." A cell is an expression whose output happens to look like a list, or a chart, or a feed. Renderers dispatch on shape.

This is the Mathematica `_repr_html_` lineage, the Jupyter cell-output model, the Smalltalk morph protocol — applied to a spatial canvas of programmable units.

Three consequences fall out:

1. **Cells become more versatile.** Changing what a cell shows is a change to its expression; the renderer adapts.
2. **The DSL stays small.** There is one `show as` keyword; the rest is renderer selection and options.
3. **The platform is extensible the right way.** New renderers add new ways to *see* data, not new ways to *write* expressions. The language stays stable; the surface gets richer.

---

## 2. Dispatch: data shape to default renderer

When a cell omits `show as` (or when the user is first authoring), Wovith picks a default renderer based on the data shape produced by the expression.

| Data shape | Default renderer |
|---|---|
| Stream of items with title-like field | `list` |
| Stream of items with timestamp field | `feed` |
| Single object | `card` |
| Stream of items with image preview | `cards` |
| Stream of time-ordered events | `timeline` |
| Stream of items with lat/lng | `map` |
| Stream of records with consistent fields | `table` |
| Stream of grouped items | `kanban` |
| Numeric series with x/y | `chart` |
| Single text blob (e.g. from `summarize with`) | `text` |
| Single number | `count` |
| Anything unrecognized | `raw` |

The dispatch is heuristic but deterministic. The cell's chosen renderer is always visible in the inspector and is one click to override. When the user adds an explicit `show as` to the DSL, dispatch is bypassed.

The dispatch decision is also annotated in the inspector with a brief explanation: *"Defaulted to `feed` because items have a `received` timestamp."* This is part of the trust grammar — the user always knows why a cell looks the way it does.

---

## 3. The built-in renderer library

The set of renderers Wovith ships with at v1. Each is described by its accepted shape, its visual layout, its default behavior, and its options.

### 3.1 `list`

**Accepts:** stream of items with at least one title-like field (`title`, `subject`, `name`, `summary`).

**Layout:** vertical stack of rows. Each row is a single line of bold title text, optionally with a secondary line below. No images, no rich previews. Dense.

**Default behavior:** displays the title from the most likely field. Truncates long titles with ellipsis. Spacing is calm — generous vertical padding so the eye can scan.

**Options:**
- `compact: true` — tightens vertical spacing
- `subtitle: from "<field>"` — shows a secondary line beneath each title
- `trailing: from "<field>"` — shows a right-aligned trailing element (count, time, status)
- `divider: subtle` / `none` — divider between rows

**Use cases:** invoices, files, tasks, anything fundamentally line-shaped.

**Mobile adaptation:** rows widen to fill the screen. Trailing element collapses to a second line on narrow screens.

---

### 3.2 `feed`

**Accepts:** stream of items with a timestamp.

**Layout:** chronological stack. Each item is a small card with timestamp, source indicator, title, and optional preview text. Newer items appear at the top; the cell scrolls vertically for older items.

**Default behavior:** auto-groups items by relative time bucket (today, yesterday, this week, earlier). Bucket headers are visible but soft.

**Options:**
- `group_by: "<bucket>"` — `day`, `week`, `source`, or a custom field
- `compact: true` — removes preview text; single-line per item
- `show_avatar: true` — shows sender/author avatars
- `expand_on_click: true` — clicking expands the item inline

**Use cases:** email, Slack, activity streams, anything chronological.

**Mobile adaptation:** items widen, bucket headers stay sticky on scroll.

---

### 3.3 `card`

**Accepts:** a single structured object.

**Layout:** a single full-cell display showing the object's salient fields with appropriate visual hierarchy — title at top, body, metadata at bottom. Images embedded inline where present.

**Default behavior:** picks the most prominent fields by heuristic. Rich content (markdown, image) is rendered, not shown as raw text.

**Options:**
- `layout: hero / detailed / minimal` — controls visual density
- `accent: from "<field>"` — colors the card based on a field value
- `actions: [...]` — adds action buttons (open source, dismiss, fork into new cell)

**Use cases:** a single document, an active calendar event, an active task, an agent summary.

**Mobile adaptation:** card becomes full-width with stacked sections.

---

### 3.4 `cards`

**Accepts:** stream of items with rich preview data (image, summary, metadata).

**Layout:** grid of cards. Each card has an image area at top, title below, optional subtitle and metadata at bottom. Cards reflow based on cell size.

**Default behavior:** picks 2-4 fields to display per card. Cards have consistent height; content is truncated with ellipsis.

**Options:**
- `thumbnail: from "<field>"` — explicit image source
- `subtitle: from "<field>"`
- `footer: from "<field>"`
- `columns: <n>` — fixed column count instead of auto-reflow
- `gap: tight / normal / loose`

**Use cases:** articles, products, podcasts, photos with metadata.

**Mobile adaptation:** cards reflow to single column. Image scales to card width.

---

### 3.5 `timeline`

**Accepts:** stream of time-anchored items.

**Layout:** horizontal time axis at top, items rendered as blocks along the axis. Blocks have height proportional to duration when items have one; otherwise uniform height. Color-coded by source or category.

**Default behavior:** auto-ranges the axis to show all items with reasonable padding. Now-indicator visible for cells displaying current time periods.

**Options:**
- `range: today / this_week / this_month / custom` — axis range override
- `density: dense / normal / sparse` — vertical spacing of blocks
- `group_by: "<field>"` — render as parallel rows for groupings (one row per location, attendee, etc.)
- `show_now: true / false` — vertical now-line

**Use cases:** calendar, project timelines, event sequences, history scrubbers.

**Mobile adaptation:** rotates to vertical orientation by default (time flows downward), since horizontal scrolling is awkward on phones.

---

### 3.6 `grid`

**Accepts:** stream of visually-dominant items (photos, thumbnails).

**Layout:** uniform grid of equally-sized cells, each showing one item's image. Minimal text overlay.

**Default behavior:** grid sizing adapts to cell width. 4x4 to 6x6 typically. Hover reveals title overlay.

**Options:**
- `columns: <n>` — fixed columns
- `aspect: square / landscape / portrait` — cell aspect ratio
- `title_overlay: hover / always / none`

**Use cases:** photos, design references, product imagery.

**Mobile adaptation:** columns reduce; spacing tightens.

---

### 3.7 `chart`

**Accepts:** a chart specification (numeric data with x/y or similar structure).

**Layout:** the chart, rendered using a charting library (Recharts, Vega-Lite, or similar). Axes labeled, legend visible.

**Default behavior:** auto-picks chart type by shape — line for time series, bar for categorical, pie for proportions, scatter for two-axis. The user can override.

**Options:**
- `type: line / bar / pie / scatter / area / heatmap`
- `x: "<field>"`, `y: "<field>"` — explicit field selection
- `color: from "<field>"` — color encoding
- `title: "<string>"`
- `annotations: [...]` — points of interest

**Use cases:** metrics, financial data, trend lines, distributions.

**Mobile adaptation:** chart scales to cell width; labels reformat to vertical orientation as needed.

---

### 3.8 `table`

**Accepts:** stream of records with consistent fields.

**Layout:** standard tabular data with header row and item rows. Sortable column headers, frozen-row support for large tables.

**Default behavior:** all fields appear as columns by default; user can hide columns. Type-aware formatting (dates, numbers, booleans).

**Options:**
- `columns: [...]` — explicit column list and order
- `sort_by: "<field>" <asc/desc>` — default sort
- `row_height: compact / normal / loose`
- `striped: true` — alternating row colors

**Use cases:** structured data, exports, anything fundamentally table-shaped.

**Mobile adaptation:** tables become horizontally-scrollable on narrow screens, with the first column frozen.

---

### 3.9 `kanban`

**Accepts:** stream of items grouped by a categorical key (status, stage, type).

**Layout:** columns side-by-side, one per group. Each column has a header (group name) and a stack of cards. Cards are draggable between columns.

**Default behavior:** drag-and-drop reorders items within column and moves them between columns. Movement triggers a state change action if the source supports it; otherwise it's display-only.

**Options:**
- `columns: ["<group>", ...]` — explicit column order
- `card_layout: minimal / detailed`
- `wip_limits: { ... }` — show warning when column exceeds limit

**Use cases:** project boards, task statuses, pipeline stages.

**Mobile adaptation:** columns scroll horizontally; one column at a time fits on a phone screen.

---

### 3.10 `map`

**Accepts:** stream of items with lat/lng or location data.

**Layout:** geographic map filling the cell, with item markers placed at their coordinates.

**Default behavior:** auto-fits viewport to show all markers. Clicking a marker opens a popover with item details.

**Options:**
- `center: "<coords>"` and `zoom: <n>` — explicit viewport
- `style: light / dark / satellite / minimal`
- `cluster: true` — cluster nearby markers
- `marker: from "<field>"` — color or icon by field value

**Use cases:** travel, location-based notes, geospatial data.

**Mobile adaptation:** standard map gesture support (pinch, drag). Markers slightly larger for touch.

---

### 3.11 `text`

**Accepts:** a single text blob (often from `summarize with agent`).

**Layout:** the text, rendered with markdown formatting if applicable. Generous padding. Selectable.

**Default behavior:** renders markdown (headings, lists, code blocks). Long text scrolls within the cell.

**Options:**
- `font: prose / monospace` — typeface choice
- `size: regular / large` — text size

**Use cases:** agent-generated summaries, briefings, single-paragraph insights.

**Mobile adaptation:** text widens; line length stays readable.

---

### 3.12 `count`

**Accepts:** a single number.

**Layout:** a single large number filling the cell, with an optional label below.

**Default behavior:** number is rendered very large (the cell's height drives the type size). Color coding optional.

**Options:**
- `label: "<string>"` — text under the number
- `compare: "<previous>"` — show delta from a previous value
- `color: from condition` — color the number based on a condition

**Use cases:** stat cells (unread count, items remaining, current value).

**Mobile adaptation:** number scales; label remains readable.

---

### 3.13 `raw`

**Accepts:** anything.

**Layout:** the data, rendered as syntax-highlighted JSON.

**Default behavior:** the escape hatch. Always available. Always shows the underlying structure of what the expression produced.

**Options:** none.

**Use cases:** debugging, exploration, "why isn't my cell working" introspection.

---

## 4. The freshness visual grammar

This is the most important visual element in the entire product. It's how the user knows what is fresh, what is stale, what is failing, what is in flight. Get it right and the product feels alive and trustable. Get it wrong and every interaction has a small undercurrent of anxiety.

The grammar is implemented as a single small indicator on the cell — a circle, roughly 8 pixels in diameter, positioned at the bottom-right corner of the cell when the cell is at rest, more prominent when the cell is being interacted with.

### 4.1 The states

| State | Visual | Meaning |
|---|---|---|
| Fresh | Green, gentle outward pulse every ~3 seconds | Recently computed, current |
| Steady | Green, no pulse | Computed, no recent change |
| Stale | Yellow, no pulse | Beyond freshness budget; refresh queued |
| Recomputing | Yellow with rotating arc | Refresh in progress, fast |
| Working | Orange with breathing animation | Agent operation in progress, slow |
| Stuck | Orange with paused breathing | Slow operation taking longer than expected |
| Failed | Red, steady | Last evaluation failed |
| Suspended | Gray, dim | Cell paused by user or system |
| Stub | Light blue, slowly pulsing | Cell exists but has never been evaluated (draft, just-added) |

### 4.2 The principles

**Pulses, not spinners.** Spinners say "wait." Pulses say "alive." A cell that's fresh and recently updated *pulses gently* — not as a notification, but as a sign that it is currently true. Stale cells stop pulsing. Failed cells go red. The visual vocabulary leans toward heartbeat metaphors and away from progress-bar metaphors.

**Persistent but not loud.** The indicator is always visible but always small. It does not draw attention except when it changes state. State changes are subtly animated (the pulse fades, the color transitions over 200-300ms) but never aggressive.

**Hovering reveals timing.** Hovering over the indicator reveals a small tooltip with the last refresh timestamp and the cell's freshness budget. *"Last refreshed 23 seconds ago • Budget: 5 minutes"*. This is for users who want the precise timing; it's not in the default visual.

**Color is information, not decoration.** Green is good. Yellow is "wait." Orange is "patient agent work in progress." Red is failed. Gray is paused. Light blue is draft. The palette is consistent across all renderers; users learn it within a session.

**Reduced-motion alternative.** Users with reduced-motion preferences get static colors instead of pulses, with explicit state badges (a small character glyph alongside the dot) for the color-blind.

### 4.3 The breathing animation for slow cells

When a cell is in a slow agentic operation, the freshness indicator is orange and *breathes* — slowly expands and contracts over 2-3 seconds. The breath is slow enough to feel patient. The breath continues for as long as the operation is in progress.

If the operation exceeds an expected duration (a heuristic: 30 seconds, or 2x the cell's recent average), the breath slows further and pauses every few cycles — the visual equivalent of the indicator saying "I am still here but I am taking longer than usual." This is the difference between a busy app and a calm one.

### 4.4 The whole-cell freshness affordance

Beyond the indicator, the cell as a whole reflects freshness:

- **Fresh cells** have full opacity and sharp text
- **Stale cells** desaturate slightly — the data is still legible but visually quieter
- **Failed cells** show a small overlay at the bottom edge with a brief error and a retry affordance
- **Recomputing cells** flash a single subtle shimmer down the cell as the new data arrives, to indicate "this was just updated"

The shimmer is the secret weapon. It tells the user *"something changed here"* without being a notification. It's the cell's way of saying "look at me if you care."

---

## 5. Layout, sizing, and spatial behavior

### 5.1 Cell positioning

Cells live at spatial positions on the canvas. Positions are stored as `(x, y)` in lens coordinates. Sizes are stored as `(width, height)`.

The canvas itself is infinite — there is no fixed bounds. Users pan and zoom freely. New cells are placed in the visible viewport by default; the user can drag them elsewhere.

### 5.2 Cell sizes

Cells have minimum sizes (160px x 120px) and no maximum. Resizing a cell is direct: the user drags an edge. The renderer adapts:

- A `list` cell with more space shows more rows
- A `cards` cell with more space adds more columns
- A `chart` cell with more space increases axis resolution and label space
- A `card` cell with more space increases padding and image size

There is no responsive breakpoint magic — renderers continuously adapt to whatever size they're given.

### 5.3 Cell alignment

A subtle snap-to-grid (12px) helps cells align visually. The grid is invisible but cells tend to line up when dragged. Users can disable snap if they want fully free positioning.

### 5.4 Spatial relationships

Cells don't have semantic relationships from their spatial positions — adjacency does not imply data flow. This is intentional. The user can put any cell anywhere; meaning comes from the cell expressions, not the layout.

(Exception: in lens overlay mode, the spatial layout is used to detect collisions and offset accordingly. See the design walkthrough doc, section 12.)

---

## 6. Interactions within a cell

Cells are not just visual surfaces — they support direct interaction.

### 6.1 Item-level interactions

For renderers that show streams of items (`list`, `feed`, `cards`, `timeline`, `grid`, `table`, `kanban`):

- **Click an item** → opens it in its source app (or in a Wovith-side viewer if the item is small and self-contained)
- **Shift+click an item** → expand inline within the cell (for cards/feed); show details below the row (for list/table)
- **Right-click an item** → context menu: open, dismiss, pin, fork into new cell, copy reference, show provenance
- **Drag an item out** → drag-and-drop to other cells, other apps, the OS clipboard
- **Up-arrow / down-arrow on an item** (keyboard nav) → moves selection within the cell
- **`d` on a selected item** → dismiss
- **`p` on a selected item** → pin

### 6.2 Cell-level interactions

For the cell as a whole:

- **Click the cell handle** (top-left on hover) → select the cell
- **Drag the cell** → move it on the canvas
- **Resize edges** → resize
- **Right-click the cell background** → cell context menu: edit, inspect, fork, suspend, archive, see history
- **Double-click the cell** → open the inspector
- **`i` on a selected cell** → open inspector
- **`p` on a selected cell** → open provenance panel
- **`Delete` on a selected cell** → archive (recoverable)

### 6.3 Inline editing

For some renderer types (`text`, `table`), editing the rendered content directly is possible when the source supports writes. A cell sourced from a Notion page rendering as `text` can be edited inline; the edit propagates to Notion through MCP. This is a power-user feature; the cell visually indicates editability before the user clicks.

---

## 7. Provenance UI integration

Every renderer integrates with provenance the same way: a hover affordance on individual items reveals a small lineage popover, and the cell-level provenance panel is one click away from the inspector.

### 7.1 Item-level provenance hover

Hovering over an item in any renderer for >500ms shows a small tooltip-style popover with:

- Source (which connector, which resource)
- Filters that admitted this item (with scores if scored)
- Rank position in the cell

This is lightweight, available everywhere, and dismisses on mouse-out.

### 7.2 Cell-level provenance panel

Inside the inspector, the "Why is this here?" panel shows the full lineage for the cell. Already documented in the design walkthrough doc, section 9.

The renderer integrates by highlighting items as the user hovers them in the provenance panel — hover an item in provenance, the corresponding item in the cell briefly highlights. This bidirectional linking is small but important: it makes the lineage feel concrete, attached to specific things on screen.

---

## 8. Custom renderers and extension

The built-in renderer set covers the common cases. The long tail is served by custom renderers — plugins that declare a data shape and provide a rendering implementation.

### 8.1 Renderer plugins

A custom renderer plugin is a package containing:

- A name (used in `show as <name>`)
- A declared accepted data shape
- A declared option schema
- The rendering implementation (web components, React, or similar)
- A small icon and description for the renderer browser

Users browse custom renderers from a built-in library, install them, and use them in their cells. Renderers are sandboxed — they can render data but cannot make outbound network calls, access the filesystem, or escape their cell boundary.

### 8.2 Quality and trust signals

Custom renderers carry trust signals — author, install count, last update, security review status. The user is shown these before installing. Renderers from the Wovith team are marked as such; community renderers are clearly labeled.

### 8.3 Renderers cannot break the visual grammar

Custom renderers must integrate with the freshness visual grammar. They are not free to render their own loading state, error state, or freshness indicator — the cell shell handles all of that. The renderer controls only the content area of the cell.

This constraint keeps the canvas visually coherent even when populated with many custom renderers. A user with 30 cells from 30 different renderers should still see one consistent visual language.

---

## 9. Performance and incremental updates

### 9.1 Incremental rendering

When a cell's data changes, the renderer ideally updates only the parts that changed — not a full re-render. The runtime provides change deltas to the renderer; the renderer applies them.

For most built-in renderers this is straightforward (item added, removed, updated, reordered). Custom renderers can opt into incremental updates by handling the delta interface, or fall back to full re-render on every change.

### 9.2 Virtualized rendering

Renderers that produce long lists (`list`, `feed`, `table`) virtualize: only items visible in the viewport are rendered to the DOM. Scrolling reveals more. This keeps even cells with thousands of items responsive.

### 9.3 Lazy loading of expensive content

Images, embeds, and other expensive content load lazily — only when scrolled into view. Placeholder shapes hold the layout in the meantime. This matters for cells like `cards` and `grid` where each item may have a heavy image preview.

### 9.4 Off-screen pause

When the user is on a different lens, the previous lens's cells continue running at reduced priority unless marked as background-active. This conserves resources without losing state — the cells still have their last-computed data when the user swaps back.

### 9.5 Render budget per cell

Each cell has an implicit render budget. If a renderer takes more than ~16ms (one frame) to update, the renderer is yielding too long and is automatically downgraded — for built-ins, this means dropping animations or virtualizing more aggressively; for custom renderers, this triggers a soft warning to the user and a recommendation to inspect performance.

---

## 10. Accessibility

The visual grammar must work for users with vision impairments, color blindness, motor differences, and cognitive load constraints.

### 10.1 Color blindness

The freshness palette (green, yellow, orange, red, gray, blue) is chosen to be distinguishable in the common forms of color blindness. The states also carry a glyph alongside the color (a small dot, ring, slash, or X) for users who can't rely on color alone. The glyphs are visible only in high-contrast or screen-reader-optimized modes.

### 10.2 Reduced motion

Users with reduced-motion preferences get static visuals: no pulses, no breathing, no shimmer. State changes happen instantly. The product remains fully functional; it just becomes quieter.

### 10.3 Screen reader support

Every cell announces:
- Its name and renderer type
- Its current freshness state
- Its last refresh time
- Its item count

Items within streams have appropriate ARIA semantics. The provenance panel is fully navigable by screen reader.

### 10.4 Keyboard navigation

Every interaction available with mouse is available with keyboard. Tab moves focus between cells; arrow keys move within a cell; Enter opens; Escape dismisses. This is fundamental — Wovith should be fully usable without a pointing device.

### 10.5 Contrast and density

The default visual density is moderate. A "denser" mode and a "calmer" mode are available in settings, each with adjusted padding, font sizes, and contrast levels. Both pass WCAG AA at minimum.

---

## 11. Mobile renderer adaptations

Every built-in renderer adapts to the mobile form factor. The general principle: mobile is a different optimum, not a degraded desktop.

### 11.1 Cell sizing on mobile

Cells on mobile do not retain their desktop spatial positions. The lens-on-mobile arrangement is a tall vertical stack (see the mobile walkthrough doc). Each cell takes the full screen width and a height appropriate to its content and renderer.

### 11.2 Touch-optimized interactions

Touch targets are larger (44pt minimum). Hover-only affordances are replaced with tap-to-reveal. Drag-and-drop is supported but reweighted — most reordering happens through long-press-and-drag.

### 11.3 Renderer-specific mobile behaviors

Already noted under each renderer in section 3, but summarized:

- `list` and `feed` get more vertical space per item
- `cards` reflow to single column
- `timeline` rotates to vertical
- `grid` reduces columns
- `chart` scales and reformats labels
- `table` becomes horizontally scrollable with frozen first column
- `kanban` shows one column at a time, swipeable
- `map` uses native gesture support

### 11.4 Lock-screen and widget rendering

On Android (and later iOS), select renderers can render as widgets on the lock screen or home screen. The widget shows the cell's most-recent computed output, refreshed on a coarser cadence than the in-app cell. Tapping the widget opens Wovith to the relevant lens. Widget-eligible renderers are a subset of the full set: `count`, `card`, `list` (compact), `chart`, and `feed` (top three items).

---

## 12. Future renderer directions

These are out of scope for v1 but worth designing toward:

### 12.1 Interactive widgets

Some cells could include interactive controls — sliders, dropdowns, search inputs — that modify the cell's behavior in real time. This pushes Wovith further toward the Observable-cell model. The DSL would need a way to express "this option is a knob the user can turn," and the renderer would need to expose that knob.

### 12.2 Embedded multimedia

Audio playback, video playback, live transcripts — for cells whose data is fundamentally media. Treated as renderers, with media-specific affordances.

### 12.3 3D and spatial renderers

For VR/AR contexts or for data that's fundamentally spatial. Speculative for v1; worth a place in the design surface.

### 12.4 Live collaboration in a cell

When a lens is shared as a co-lens, the cell could show presence — who else is looking at this cell right now, where their cursor is. This depends on the multi-user infrastructure being mature; v2 territory.

---

## 13. The renderer-as-language-element principle

To close: a note on why renderers matter as much as the DSL itself.

Wovith's cells are *expressions that render*. The expression and the rendering are equal partners. A cell whose expression is brilliant but whose rendering is wrong is not a useful cell. A cell whose rendering is gorgeous but whose expression is broken is not a useful cell.

The DSL is what the user writes. The renderer is what the user sees. Together they constitute the cell. Together they are how the product earns its place in someone's daily life.

The design rule that follows: every renderer is held to the same level of care as the DSL. The grammar is small; the renderers are well-thought-out. The grammar composes; the renderers compose with the freshness grammar, the provenance grammar, and the canvas's spatial behavior. There are no second-class renderers.

That's the standard. Hit it, and the canvas feels coherent. Miss it on any one renderer, and the cracks show across the whole product.

---

## References

- Observable Plot — declarative chart library, primary chart-renderer inspiration
- Recharts / Vega-Lite — practical chart libraries to build on
- Apple Human Interface Guidelines — touch target and accessibility baselines
- Material Design (Google) — color and motion grounding
- Calm Technology (Mark Weiser, Amber Case) — design philosophy for ambient presence
- Smalltalk morphs — moldable visual objects with rich behavior; lineage for the renderer-as-object concept
- Mathematica `_repr_*_` methods — polymorphic rendering precedent
