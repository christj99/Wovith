# Wovith Visual Design System
### Color, typography, spacing, motion, and component grammar

---

## 0. About this document

This document specifies the visual foundations of Wovith — the design tokens, type system, motion language, and component patterns that every part of the product is built from.

The system is opinionated. Specific values are committed where defaults are needed; where ambiguity would compound, the document picks a side. Where future revisions might want to take a different call, the rationale is noted so the call can be revisited deliberately rather than reflexively.

The system is grounded in three external traditions:

- **Calm technology** (Amber Case, Mark Weiser) — design philosophy for ambient presence
- **The semantic color tradition** (Radix Colors, Vercel Geist) — 12-step scales designed for UI roles
- **Modern motion design conventions** (Material Design 3, Carbon, Framer/Motion) — timing tokens, asymmetric easing, spring physics for high-stakes moments

Where Wovith makes specific choices that diverge from these traditions, the reasoning is given.

---

## 1. Design principles

Six principles guide every visual decision. They are listed in priority order — when principles conflict, the earlier one wins.

### 1.1 Calm before clever

Wovith hosts agentic computation, reactive data, and constantly-changing content. The default visual register is calm — generous whitespace, restrained color, modest motion. Cleverness is allowed only when it earns its place by clarifying something the user needs to understand.

### 1.2 Trust through legibility

Every state the system is in must be visible to the user. Fresh vs. stale, succeeded vs. failed, fast vs. slow, certain vs. uncertain. The visual language is the contract by which the user trusts the agent.

### 1.3 Restraint is a feature

The product will be used for hours a day, often in moments when the user is busy or distracted. The visual design must not compete for attention with the user's actual life. Maximalist aesthetics — heavy gradients, decorative motion, bold color — are excluded unless they have a specific functional purpose.

### 1.4 The cell is the unit

The visual system is built around the cell as the fundamental component. Every other element — the canvas, the inspector, the provenance panel, the lens overview — supports the cell. Cells are the focal points; chrome serves them.

### 1.5 Density is contextual

Different surfaces need different densities. The canvas is calm and spacious. The inspector is informative and tight. The DSL editor is dense and technical. The same type and color system supports all three through size and spacing variation, not through three different design languages.

### 1.6 Accessibility is foundational

Every color combination, motion pattern, and interaction must work for users with vision impairments, reduced motion preferences, motor differences, or cognitive load constraints. Accessibility is checked at every level, not bolted on at the end.

---

## 2. Color system

The color system is built on a 12-step semantic scale, structurally inspired by Radix Colors. Each color scale has twelve numbered steps, each with a defined purpose in the UI.

### 2.1 The 12-step scale meaning

| Step | Use |
|---|---|
| 1 | Page background |
| 2 | Subtle background (surface contrast) |
| 3 | UI element background |
| 4 | Hovered UI element background |
| 5 | Active / Selected UI element background |
| 6 | Subtle borders, separators |
| 7 | UI element borders, focused borders |
| 8 | Hovered UI element borders |
| 9 | Solid backgrounds (filled buttons, badges) |
| 10 | Hovered solid backgrounds |
| 11 | Low-contrast text |
| 12 | High-contrast text |

Steps 1-5 are background tones. Steps 6-8 are borders and separators. Steps 9-10 are solid color elements. Steps 11-12 are text. This semantic structure is consistent across every color in the system — the gray scale, the accent scale, and each semantic color (success, warning, danger, etc.) all follow the same numeric meaning.

### 2.2 The gray scale: Slate

Wovith uses **Slate** as its gray scale. The choice is deliberate: slate has a subtle blue undertone that reads as cool, professional, and modern without being cold. It pairs well with both warm and cool accent colors, and in dark mode it produces a near-charcoal that's softer than pure black.

Concrete light-mode reference values (matching Radix Slate):

| Step | Light hex |
|---|---|
| 1 | `#FBFCFD` |
| 2 | `#F8F9FA` |
| 3 | `#F1F3F5` |
| 4 | `#ECEEF0` |
| 5 | `#E6E8EB` |
| 6 | `#DFE3E6` |
| 7 | `#D7DBDF` |
| 8 | `#C1C8CD` |
| 9 | `#889096` |
| 10 | `#7E868C` |
| 11 | `#687076` |
| 12 | `#11181C` |

Dark mode uses Radix Slate Dark — same semantic meaning, inverted intensity. Step 1 becomes the near-charcoal background; step 12 becomes the near-white text.

### 2.3 The accent: Indigo

Wovith's accent color is **Indigo**. The choice signals "calm intelligence" — indigo carries associations with technical clarity and quiet competence, without the aggression of pure blue or the playfulness of purple. It's the same lineage as Geist, Linear, and most modern technical products, but desaturated slightly to keep the calm register.

Concrete light-mode values:

| Step | Light hex |
|---|---|
| 1 | `#FDFDFE` |
| 2 | `#F8FAFF` |
| 3 | `#F0F4FF` |
| 4 | `#E6EDFE` |
| 5 | `#D9E2FC` |
| 6 | `#C6D4F9` |
| 7 | `#AEC0F5` |
| 8 | `#8DA4EF` |
| 9 | `#3E63DD` |
| 10 | `#3A5CCC` |
| 11 | `#3451B2` |
| 12 | `#101D46` |

Step 9 (`#3E63DD`) is the primary indigo — the color of primary buttons, focus rings, active states, and the iris of the lens-swap animation.

### 2.4 The freshness palette

This is the most semantically loaded subset of the color system. Each freshness state maps to a specific scale, and the scales are chosen for distinguishability across color vision differences.

| State | Scale | Step | Example light hex |
|---|---|---|---|
| Fresh | Green | 9 | `#30A46C` |
| Steady | Green | 10 | `#2B9A66` |
| Stale | Amber | 9 | `#FFB224` |
| Recomputing | Amber | 9 (with rotation) | `#FFB224` |
| Working | Orange | 9 | `#F76B15` |
| Stuck | Orange | 10 | `#EF5F00` |
| Failed | Red | 9 | `#E5484D` |
| Suspended | Slate | 7 | `#D7DBDF` |
| Stub | Sky | 7 | `#9DDDFB` |

The greens and reds are far enough apart in luminance to be distinguishable in protanopia and deuteranopia (the most common forms of color blindness). Amber and orange are visually adjacent but functionally adjacent too (both are "wait" states), so the overlap is acceptable. Each state also carries a small glyph in high-contrast or reduced-motion modes (a dot, ring, arc, slash) so the meaning never depends on color alone.

### 2.5 Semantic colors beyond freshness

A small set of semantic colors covers the rest of the UI:

| Purpose | Scale |
|---|---|
| Success (positive confirmations, "done" states) | Green |
| Warning (non-blocking caution) | Amber |
| Error (blocking failures, hard-to-undo actions) | Red |
| Info (informational callouts, agent suggestions) | Sky |

These follow the 12-step convention. A success toast uses green-9 for the background and green-11 for the text. A warning callout uses amber-3 for the background, amber-7 for the border, and amber-12 for the text. The semantic meaning is consistent across the product.

### 2.6 Alpha variants

Each color has matching alpha variants — semi-transparent versions designed to overlay onto colored backgrounds while preserving the apparent color. Alpha variants are used for:

- Hover overlays on solid-colored buttons (slate-A4 over indigo-9)
- Selection highlights (indigo-A3 over the cell's normal background)
- Subtle dividers that need to work across multiple surfaces (slate-A6)

Alpha variants follow Radix's convention: the alpha values are calibrated so that placing them over the canonical page background (slate-1) produces visually identical results to the solid version.

### 2.7 Light and dark mode

Both modes are first-class. Wovith does not have a "primary" mode. The dark mode is not an inversion of light — it has its own carefully tuned scale where step 1 is the canvas background (near-charcoal `#0E1419` for slate dark), step 9 is the accent solid, and step 12 is the high-contrast text.

The product follows the OS theme by default. Users can override to a fixed light or dark mode in settings. The transition between modes is animated over 250ms with a cross-fade, not an instant swap — calm tech principle.

### 2.8 What this system explicitly avoids

A few deliberate exclusions:

- **No gradient-heavy aesthetic.** The 2024-era "gradient meshes everywhere" aesthetic is excluded. Solid fills and subtle borders are the rule.
- **No glassmorphism on functional surfaces.** Frosted blur is allowed only as a transition aid (e.g., the slide-over invocation overlay), never as a primary surface treatment.
- **No "AI brand" gradient.** The recent trend of putting iridescent purple-pink gradients on anything AI-related is absent from Wovith. The product's AI nature is communicated through behavior, not visual branding.
- **No high-saturation color outside semantic uses.** Saturated color belongs to freshness states, semantic states, and the accent. It does not appear as decoration.

---

## 3. Typography

Two typefaces. One for the interface, one for code.

### 3.1 The interface typeface: Inter

**Inter** (Rasmus Andersson, open source) is Wovith's UI body and display typeface. The choice is deliberate. Inter has the highest legibility-at-small-sizes profile of any contemporary UI font, scales gracefully across all interface contexts, supports a wide language range, and reads as professional without being austere.

Used everywhere except DSL/code blocks and the rare hero moment described below.

Variable font format (`Inter.var.woff2`) is the canonical delivery. Static fallback weights ship for environments that don't support variable fonts.

Used weights:
- 400 (Regular) — body text, default UI
- 500 (Medium) — UI emphasis, button text, lens names in lists
- 600 (Semibold) — section headings, cell names
- 700 (Bold) — display headings, lens names in overview

### 3.2 The code typeface: Geist Mono

**Geist Mono** (Vercel / Basement Studio, open source) is Wovith's monospace typeface. It's used for:

- DSL expressions in the inspector
- The expression editor while authoring a cell in DSL mode
- Inline code references in documentation
- Any structured data display (the `raw` renderer)

Geist Mono was specifically designed for developer environments. It has high x-height, distinct similar characters (1 / l / I, O / 0), and predictable horizontal rhythm. Paired with Inter, the two typefaces share enough geometric DNA to coexist comfortably while remaining clearly distinct.

Used weights:
- 400 (Regular) — default DSL display
- 500 (Medium) — emphasized DSL tokens (keywords)

### 3.3 The optional display typeface: Source Serif (deferred)

For the rare moment when a serif communicates "this is special" — the agent-generated `text` renderer, the lens name at the top of an empty hero state, certain marketing surfaces — Wovith reserves the option to use **Source Serif 4** (Adobe, open source). Source Serif pairs naturally with Inter and adds warmth at large sizes.

The serif is *not* a v1 commitment. The initial product ships with Inter and Geist Mono only. The serif may join later if specific contexts justify it. Reserved here so the decision is intentional when made.

### 3.4 Type scale

Wovith uses a **Major Third (1.25)** modular scale, anchored at 16px base. This is slightly more spacious than the Major Second (1.125) common in dense dashboards — Wovith is not a dashboard.

Scale, rounded to integers for clean rendering:

| Token | Size | Use |
|---|---|---|
| caption | 12px | Very small UI labels, footnotes, freshness timestamps |
| small | 14px | Secondary UI text, dense lists, button labels |
| body | 16px | Default body text, reading text in cells |
| body-lg | 20px | Prominent UI text, cell titles |
| h4 | 24px | Section headings in inspector |
| h3 | 30px | Section headings on the canvas, lens names in overview |
| h2 | 38px | Lens name when at top of current lens |
| h1 | 48px | Hero text on onboarding screens |
| display | 60px | Marketing, never inside the running product |

Sizes above body-lg are rare in the actual product UI. Cells lean on the smaller end of the scale (body and below) because they need to display real content density.

### 3.5 Line height

Line height is set per type role, not per font size. The general rule: tighter line heights for headings (where lines are short and standalone), more generous line heights for body text.

| Token | Multiplier | Use |
|---|---|---|
| tight | 1.0 | Buttons, single-line labels |
| snug | 1.2 | Headings, prominent UI text |
| normal | 1.5 | Body text, long-form reading |
| loose | 1.625 | Dense paragraphs needing extra breathing room |

Line heights are calculated to fall on the 4pt baseline grid (see section 4). A 16px body with normal line height resolves to 24px — clean multiple of 4.

### 3.6 Letter spacing

Letter spacing is left at the typeface's natural metrics in almost all cases. Two exceptions:

- All-caps labels (rare; mostly avoided) get +1% tracking to compensate for the reduced lower-case rhythm
- Very small text (12px and below) gets +0.5% tracking to improve legibility

Wovith does not use letter-spacing as a decorative element. No "wide-tracked logo" treatment.

### 3.7 Numeric tabular figures

For any UI element where numbers are aligned vertically (counts, timestamps, freshness budgets, table cells), tabular figures are used. Both Inter and Geist Mono have tabular-figures features that are enabled via the `font-feature-settings` of `"tnum"`.

---

## 4. Spacing system

A 4pt baseline grid anchors everything; an 8pt scale provides the most common values.

### 4.1 The token scale

| Token | Pixels | Common use |
|---|---|---|
| 0 | 0 | No spacing |
| px | 1 | Borders, dividers |
| 0.5 | 2 | Very tight icon-text gaps |
| 1 | 4 | Tight gaps inside dense elements |
| 1.5 | 6 | Less common, half step |
| 2 | 8 | Standard component padding for compact elements |
| 3 | 12 | Padding inside cards, gaps between icon and text |
| 4 | 16 | Standard padding inside cells, gaps between items in a list |
| 5 | 20 | Less common, half step |
| 6 | 24 | Section spacing within a cell |
| 8 | 32 | Spacing between cells on the canvas |
| 10 | 40 | Larger section spacing |
| 12 | 48 | Page padding, major section gaps |
| 16 | 64 | Hero spacing, onboarding screens |
| 24 | 96 | Very rare, only on marketing surfaces |
| 32 | 128 | Only on full-screen empty states |

Most UI uses tokens 2 through 8. Tokens 12 and above are reserved for marketing or onboarding.

### 4.2 The baseline rule

Every text element's vertical position falls on the 4pt baseline. Every component's height is a multiple of 4pt. This is enforced in the design system so that all UI elements visually align by default.

Exceptions are rare and explicitly noted (e.g., the freshness indicator dot, which is 8px and centered on its anchor — the dot's geometry doesn't need to align to baseline).

### 4.3 Cell spacing rules

On the canvas, cells follow specific spacing rules:

- Minimum gap between cells: 24px (token 6)
- Cell internal padding: 16px (token 4) on all sides for normal density
- Compact cell padding: 12px (token 3) — used when user has selected compact density
- Cell title to body gap: 12px (token 3)
- Cell footer (freshness, last-refresh) margin top: 8px (token 2)

### 4.4 The inspector panel spacing

The inspector is denser than the canvas. It uses tokens 2 and 3 throughout, with token 4 reserved for major section breaks. The total inspector width is 320px on desktop, full-width on mobile.

---

## 5. Motion design

Motion in Wovith is functional, not decorative. Every animation serves one of these purposes: communicate a state change, show continuity, indicate readiness, or convey freshness. Motion that doesn't serve one of these purposes is removed.

### 5.1 Duration tokens

| Token | Value | Use |
|---|---|---|
| instant | 0ms | Reduced-motion mode; state changes that the user shouldn't have to wait for |
| fast | 150ms | Hover states, button presses, micro-interactions |
| normal | 250ms | Most state changes: cells appearing, panels opening, theme transitions |
| slow | 400ms | Heavier transitions: lens swaps, major panel reveals |
| dramatic | 600ms | Reserved for the rare moments that need to register as significant: completing onboarding, accepting a lens proposal |

The 250ms normal is the workhorse and accounts for ~60% of all animations in the product.

### 5.2 Easing curves

Wovith uses a small set of named easing curves with semantic meaning. The 60/30/10 ratio (Baraa Aljabban's *Easing Curves Are a Design Language*, 2025) is the operating principle: 60% of animations should use the workhorse ease-out; 30% can use secondary curves for specific micro-interactions or exits; 10% are reserved for dramatic moments with spring physics.

| Token | Curve | Use |
|---|---|---|
| respond | `cubic-bezier(0, 0, 0.2, 1)` | Default ease-out. Entrances, expansions, things appearing |
| settle | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard for movements that have both an entry and an end (cell moves to a new position) |
| exit | `cubic-bezier(0.4, 0, 1, 1)` | Things leaving: cells being archived, panels closing |
| snap | `cubic-bezier(0.12, 0, 0.08, 1)` | Quick, decisive micro-interactions — toggles, switches |
| announce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Slight overshoot for moments that should register: "your lens is ready" |

The asymmetry rule is enforced: entrances use `respond` (ease-out), exits use `exit` (ease-in). This mirrors how physical objects move — they don't symmetrically reverse their arrival.

### 5.3 Spring physics for high-stakes moments

For three specific interactions, Wovith uses spring physics instead of bezier curves. Springs are reserved for moments that should feel *alive*:

1. **Lens swap.** The iris animation that transitions from one lens to another uses a spring with stiffness 200, damping 25, mass 1. The swap feels like a physical mechanism — it has weight, it settles. Duration emerges from the spring, typically 400-500ms.

2. **Cell drop-in after authoring.** When a newly-authored cell appears on the canvas, it uses a spring with stiffness 300, damping 20 (slightly bouncier). This is the "your thing is here" moment.

3. **Item dismiss with undo.** When a user dismisses an item via swipe, the toast that appears with the undo affordance uses a spring with stiffness 250, damping 22. Just enough overshoot to register as a moment.

Other animations use bezier curves. Springs are 10% of the motion vocabulary, not 50%.

### 5.4 The freshness heartbeat

The freshness indicator's pulse is a custom animation pattern, not a generic easing curve. It's specified separately because it runs continuously and needs its own profile.

- **Fresh pulse:** scale from 1.0 to 1.15 over 800ms, back to 1.0 over 1200ms. Cycle period 3000ms (with a 1000ms pause between cycles). Easing: `ease-in-out` on each phase. The pulse is subtle — a 15% scale change is barely visible at 8px, but the eye picks it up peripherally.
- **Working breath (slow agentic cells):** scale from 1.0 to 1.2 over 1500ms, back to 1.0 over 1500ms. Cycle period 3000ms with no pause. Slower, calmer than the fresh pulse — implies patience.
- **Stuck breath:** same as working but cycle period 5000ms with a 1000ms pause. Implies the system is still alive but slower than expected.

### 5.5 The shimmer on update

When a cell's data updates, a subtle horizontal shimmer passes across the cell from left to right over 400ms. The shimmer is a faint indigo-tinted gradient stripe at 6% opacity, traveling at constant velocity. It's the renderer's way of saying "something changed here" without being a notification.

The shimmer is suppressed in reduced-motion mode. The user instead sees a brief 200ms flash of indigo-A3 background overlay, fading out.

### 5.6 Lens swap animation specifics

The iris animation is the visual signature of the product. Specs:

- The current lens dims to 60% opacity over 100ms while shrinking 4% from center
- An iris "closing" animation runs (a soft circular mask shrinks toward the center) over 200ms
- The new lens's cells appear at their saved positions, faded in over 200ms with `respond` easing, with a 40ms stagger between cells (so they appear to arrive in waves rather than all at once)
- Total duration: 400-500ms

In reduced-motion mode: cells of the previous lens disappear instantly; cells of the new lens appear instantly. No animation.

### 5.7 Reduced motion

Users with `prefers-reduced-motion: reduce` get:

- All durations set to 0 (instant state changes)
- The heartbeat replaced with static colors
- The shimmer replaced with the brief flash described above
- The iris replaced with instant swap
- No spring physics

The product remains fully functional in reduced-motion mode. Functionality never depends on the motion.

---

## 6. Component grammar

The core components that the design system specifies in detail. Each is described at a level where someone implementing the design can produce a consistent result.

### 6.1 The cell shell

The fundamental container. Every cell on the canvas, regardless of renderer, uses the same shell.

- **Background:** slate-1 in light mode, slate-2 in dark mode (slightly lighter than the canvas background for subtle elevation)
- **Border:** 1px solid slate-6 in light mode, slate-7 in dark mode
- **Border radius:** 12px on all corners
- **Shadow:** none by default; on hover, a subtle elevation appears (Radix Elevation 1: `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)`)
- **Padding:** 16px on all sides
- **Header strip:** 32px tall, contains cell name (left, body-lg medium weight) and freshness indicator (right, 8px dot)
- **Footer strip:** appears on hover only, 24px tall, shows last-refreshed timestamp (caption, slate-11)

The cell shell is the most-touched component in the product. It is held to the highest precision standard.

### 6.2 The freshness indicator

8px diameter circle. Positioned 12px from the right edge and 12px from the top edge of the cell, inside the header strip. Color according to the freshness palette (section 2.4). Animation according to section 5.4.

In high-contrast or accessibility modes: an additional glyph (4px stroke-width ring, dot inside) appears next to the circle to convey state without color alone.

### 6.3 The inspector panel

Slides in from the right edge of the canvas. 320px wide on desktop, full-width on mobile. Backdrop blur of 12px on the canvas content behind it, with a slate-A2 tint overlay.

Internal layout:
- 24px padding top
- Section 1: NL summary (body, slate-12) — 80px height, scrollable if longer
- 16px gap
- Section 2: DSL expression (Geist Mono, small) — flexible height, syntax-highlighted
- 16px gap
- Section 3: Sources (small, slate-11) — list of connectors used
- 16px gap
- Section 4: Last refreshed (caption, slate-11)
- 8px gap
- Section 5: Provenance link (small, indigo-11, underlined on hover)
- 24px padding bottom

The inspector's close button is positioned in the top-right of the panel, 16px from each edge, 24px clickable area.

### 6.4 The provenance panel

Opens within the inspector when "Why is this here?" is tapped. Replaces the inspector's content (the inspector becomes a back-and-forth space).

Structure:
- A header row showing the cell name and a "back" affordance
- A list of items currently in the cell
- Each item expandable to show its lineage:
  - Source connector and resource ID
  - Filter chain (each filter with a small badge showing why it matched)
  - Ranking weights, if applicable
- Items are interactive — hovering an item in the provenance panel highlights the corresponding item in the cell on the canvas

### 6.5 The intent preview modal

Appears as a centered modal overlay when an agent action requires user review.

- Modal width: 480px on desktop, full-width on mobile
- Background: slate-1, with shadow Elevation 3 (`0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)`)
- Backdrop: slate-A6 (semi-transparent slate over the canvas)
- Border radius: 16px
- Internal padding: 24px
- Header: h4 (24px Inter Semibold) — the proposed action in plain language
- Body: itemized plan in body type, each item as a small card with relevant detail
- Confidence chip: positioned top-right of the body, body-sm indigo-11 with indigo-3 background
- Three action buttons at bottom: Proceed (indigo-9 filled, body Medium weight), Edit Plan (slate-6 bordered), Skip (text-only link)
- A "Why?" affordance below the actions opens provenance

### 6.6 The lens overview thumbnail

Each lens preview in the overview is a card showing a low-resolution live render of the lens's cells.

- Thumbnail size: 280px × 200px on desktop, full-width × auto height on mobile
- Border: 1px slate-6
- Border radius: 12px
- Internal padding: 12px (reduced from cell shell — the thumbnail is a glance, not an active surface)
- Cells inside are rendered at 30-40% of normal scale, with text shown but not interactive
- Lens name appears below the thumbnail (body-lg Medium)
- Pinned indicator (a small filled indigo-9 circle) appears top-right if pinned

Hovering a thumbnail produces a subtle scale-up (1.02) and shadow elevation (Elevation 2). Clicking transitions to the lens via the swap animation.

### 6.7 Buttons

A small button vocabulary:

- **Primary:** indigo-9 background, slate-1 text, 16px horizontal padding, 8px vertical padding, body Medium weight, 8px border radius. Hover: indigo-10 background. Used for primary actions like "Accept" and "Proceed."
- **Secondary:** transparent background, slate-7 border, slate-12 text, otherwise same dimensions. Hover: slate-3 background. Used for "Edit" and most secondary actions.
- **Tertiary:** transparent background and border, indigo-11 text, body-sm weight. Hover: text becomes indigo-12 with subtle underline. Used for "Skip" and other low-emphasis options.
- **Destructive:** red-9 background, slate-1 text, otherwise same as primary. Hover: red-10. Used only for confirmed destructive actions; the hold-to-confirm pattern uses a button that fills with this color as the user holds.

Buttons never use icons-only without text in primary or secondary contexts. Tertiary buttons may be icon-only when in a constrained UI element like the cell header.

### 6.8 Inputs

Text inputs follow the cell shell aesthetic at smaller scale.

- Background: slate-2
- Border: 1px slate-6
- Border radius: 8px
- Padding: 8px horizontal, 6px vertical
- Font: Inter Regular, body (16px)
- Focus state: border becomes indigo-7, with a 2px indigo-A4 focus ring outside the border
- Placeholder text: slate-9

The DSL editor input uses Geist Mono and has a slightly larger padding (12px / 8px) to accommodate the denser character width.

### 6.9 Iconography

Wovith uses a custom-curated subset of [Lucide](https://lucide.dev) icons — open-source, MIT-licensed, designed for UI use at small sizes. The selection is small (around 40 icons at v1), with strict criteria:

- 24px nominal size, scalable
- 1.5px stroke weight (slightly heavier than Lucide default for better legibility on dense surfaces)
- Outline style only (no filled variants in the v1 product)
- Slate-11 default color, slate-12 on hover, indigo-9 when active

Icons are paired with text labels in almost all cases. Icon-only buttons appear in constrained contexts (cell header, very small UI), and always with a tooltip.

---

## 7. Surfaces and elevation

Wovith uses a three-tier elevation model. Most of the product is flat (no shadow). Elevation appears only when something is interactive or temporarily lifted.

| Tier | Use | Specification |
|---|---|---|
| 0 (flat) | The canvas, cells at rest | No shadow |
| 1 (hover) | Cells on hover, lens thumbnails on hover, interactive overlays | `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)` |
| 2 (selected) | Selected cells, focused panels | `0 2px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.08)` |
| 3 (modal) | Modal overlays, slide-over panels, the intent preview | `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)` |

In dark mode, shadow alpha values are halved (shadows on dark surfaces are subtler and need less opacity to read).

---

## 8. The canvas as a surface

The canvas is the most consequential single surface in the product. Specifications:

- **Background:** slate-2 in light mode, slate-1 (canvas background ironically darker than the cells) in dark mode
- **Grid:** a subtle 12px grid is visible at 10% slate-6 opacity when the user is actively dragging a cell, hidden otherwise
- **Pan and zoom:** standard. Two-finger trackpad gestures, scroll-wheel zoom with modifier, click-and-drag pan
- **Zoom levels:** from 25% (overview) to 200% (zoomed in for detail). Default is 100%
- **Background pattern (optional):** a very faint dot pattern at 4% slate-9 opacity, on a 24px grid. Default is on; can be disabled in settings for users who prefer a fully clean canvas

The canvas does not have a "page" boundary. It extends infinitely. There is no notion of "edge of the canvas."

---

## 9. Accessibility specifics

### 9.1 Color contrast

All text-on-background pairings are verified against APCA (Advanced Perceptual Contrast Algorithm) targets, which more accurately predict legibility than the older WCAG ratios:

- Body text (16px+): APCA Lc 75 minimum
- Small text (14px and below): APCA Lc 90 minimum
- UI elements requiring distinction (icons, borders): APCA Lc 60 minimum

The Radix Colors system is designed to hit these targets at the canonical steps; Wovith inherits this property.

### 9.2 Focus visibility

Every interactive element has a visible focus state. The default focus ring is a 2px indigo-A4 outline with 2px offset, using `box-shadow` for crisp rendering. Focus rings respect rounded corners. Focus is never hidden, even on mouse-driven users.

### 9.3 Keyboard navigation

The full keyboard model is documented separately, but the principles:

- Tab moves focus between cells and major UI regions
- Arrow keys move within a cell or panel
- Enter activates; Escape dismisses or backs out
- Cmd/Ctrl + K opens the global command palette
- All mouse interactions have keyboard equivalents

### 9.4 Screen reader support

Every cell announces:
- Its name
- Its renderer type
- Its current freshness state (in words: "fresh, last updated 2 minutes ago" or "agent working")
- Its item count if applicable

Live regions announce state changes — when a cell's data updates, the screen reader hears "cell updated" without being interrupted from the user's current focus.

### 9.5 Touch targets

All interactive elements meet a 44pt minimum touch target on mobile and 32pt on desktop. Where visual size is smaller (like the 8px freshness indicator), the hit target is expanded to meet the minimum.

### 9.6 Color blindness

The full freshness palette and semantic color set are verified in:
- Protanopia simulation (red-green blindness, common form 1)
- Deuteranopia simulation (red-green blindness, common form 2)
- Tritanopia simulation (blue-yellow blindness, rare)

Each state is distinguishable across these simulations either by color or by accompanying glyph.

### 9.7 Density preferences

The product offers three density modes:
- **Compact:** reduced padding (-25%), tighter line heights, slightly smaller type
- **Normal:** the defaults specified throughout this document
- **Comfortable:** increased padding (+25%), more generous line heights, slightly larger type

Density is a user preference accessible from settings. The product is designed at Normal; Compact and Comfortable are scaled variants of the same design language.

---

## 10. The product's overall visual identity

Pulling back from the tokens: what does Wovith look like, in one paragraph?

Wovith looks calm. The canvas is a soft slate-tinted off-white in light mode or a near-charcoal in dark mode. Cells sit on it like cards on a desk — bordered subtly, with rounded corners and just enough whitespace inside that the content can breathe. Type is Inter, restrained and legible. The accent color is a thoughtful indigo, used sparingly. Motion is mostly invisible; when it appears, it's measured and purposeful — a gentle pulse on a fresh cell, a slow breath on a working agent, an iris on a lens swap. Nothing shouts. Nothing draws attention away from the content. The product looks like something the user could happily look at for hours without fatigue. That's the test it has to pass, every day of its life.

---

## 11. Future revisions

Things to revisit deliberately as the product matures:

- **The serif decision.** Whether to bring Source Serif (or similar) into the product for hero moments, agent summaries, or other warming touches. Reconsidered after v1 with real user feedback.
- **Custom typography.** Whether to commission a custom Wovith typeface. Probably not justified until the product has substantial reach.
- **Iconography expansion.** Whether to extend the icon set beyond Lucide, especially for distinctive product affordances (the lens swap iris, the cell types). Likely v2.
- **Brand expression beyond the product.** The marketing surface (website, social, communications) can carry more personality than the in-product UI. That's a separate design system, referencing this one.
- **Custom renderer aesthetics.** When community renderers join, they need a style guide that keeps the visual coherence without preventing creative expression. Out of scope for v1; needed by v2.

---

## References

- Radix Colors (workos / Radix UI) — semantic 12-step color scale
- Vercel Geist Typeface (Basement Studio, Vercel) — Geist Sans and Geist Mono
- Inter Typeface (Rasmus Andersson)
- Source Serif 4 (Adobe, open source)
- Material Design 3 Motion Specifications (Google)
- Carbon Design System Motion (IBM)
- Framer Motion / Motion documentation
- *Easing Curves Are a Design Language* (Baraa Aljabban, 2025)
- *Calm Technology: Principles and Patterns for Non-Intrusive Design* (Amber Case, O'Reilly)
- APCA Contrast Algorithm (Andrew Somers)
- Lucide icon library
- *Design Systems Typography Guide* (DesignSystems.com)
- US Web Design System (USWDS) typography documentation
