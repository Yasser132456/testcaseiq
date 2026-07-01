---
version: 1
north_star: "The Black Glass Instrument"
colors:
  bg: "#0a0a0a"
  surface_1: "#121212"
  surface_2: "#18181b"
  border: "#27272a"
  text: "#f5f5f5"
  text_2: "#a1a1aa"
  text_3: "#71717a"
  accent: "#b8ff5a"
  accent_bg: "rgba(184, 255, 90, 0.10)"
  accent_border: "rgba(184, 255, 90, 0.40)"
  accent_glow: "rgba(184, 255, 90, 0.28)"
  purple: "#a78bfa"
  purple_bg: "rgba(167, 139, 250, 0.10)"
  purple_border: "rgba(167, 139, 250, 0.35)"
  cyan: "#67e8f9"
  cyan_2: "#22d3ee"
  cyan_bg: "rgba(34, 211, 238, 0.09)"
  cyan_border: "rgba(34, 211, 238, 0.30)"
  green: "#22c55e"
  green_bg: "rgba(34, 197, 94, 0.09)"
  green_border: "rgba(34, 197, 94, 0.40)"
  amber: "#fbbf24"
  amber_bg: "rgba(251, 191, 36, 0.10)"
  amber_border: "rgba(251, 191, 36, 0.35)"
  red: "#f87171"
  red_bg: "rgba(248, 113, 113, 0.10)"
  red_border: "rgba(248, 113, 113, 0.45)"
typography:
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif"
  mono: "'JetBrains Mono', ui-monospace, monospace"
  scale:
    display: "clamp(1.75rem, 5vw, 4rem)"
    display_weight: 800
    body: "1rem"
    small: "0.875rem"
    xs: "0.75rem"
spacing:
  xs: "0.45rem"
  sm: "0.6rem"
  md: "0.85rem"
  base: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
radius:
  sm: "6px"
  md: "8px"
  lg: "10px"
motion:
  ease: "cubic-bezier(0.0, 0.0, 0.2, 1)"
  duration: "150ms"
  duration_slow: "250ms"
  entrance: "fadeInUp"
  entrance_keyframe: "opacity 0→1, translateY 8px→0"
breakpoints:
  mobile: "900px"
---

# Design System — TestCaseIQ

## Overview

**The Black Glass Instrument.** Obsidian tool surfaces, surgical precision, phosphor details that feel earned. A QA engineer's cockpit — not a dashboard, not a chatbot wrapper, not an enterprise form factory. Every surface is dark enough to disappear; every color is bright enough to carry meaning.

The aesthetic sits at the intersection of high-precision calibration equipment and serious developer tooling. The background is near-black (`#0a0a0a`) — not dark gray, not navy, not charcoal. Surfaces are frosted glass instruments suspended over a WebGL particle field; depth reads through translucency, blur, highlight, and cursor-responsive parallax instead of solid tonal stacking. The phosphor green accent (`#b8ff5a`) is the only saturated color that isn't carrying semantic workflow meaning; it signals "interactive, primary, do this." All other saturated colors — violet, cyan, green, amber, red — are semantic workflow signals and must not be used decoratively.

Typography is Inter for prose and JetBrains Mono for all technical content (step numbers, BDD syntax, test identifiers, code blocks). The pairing is deliberate: humanist sans for readability, geometric mono for precision. Display headings hit weight 800 at large scales.

Motion is intentional and minimal. Transitions run at 150ms (standard) or 250ms (deliberate). The entrance animation (`fadeInUp`: opacity 0→1, translateY 8px→0) is used for page and list content. Nothing bounces. Nothing elastic.

**Anti-references:** Generic SaaS light mode (beige-on-white, gradient hero text, decorative marketing softness). Heavy terminal aesthetic (no color, no hierarchy, raw monochrome). Enterprise legacy QA tools (grey-table density, joyless chrome). AI chatbot surfaces ("ask me anything" prompt bars as the primary affordance).

---

## Colors

The palette has two layers: **structural neutrals** (govern surface, text, and border) and **semantic signals** (carry workflow state). Never swap a semantic color into a structural role.

### Structural Neutrals

| Token | Value | Character | Use |
|---|---|---|---|
| `--bg` | `#0a0a0a` | Void Black | Body background. The darkest surface; nothing sits below this. |
| `--surface-1` | `#121212` | Instrument Shell | Panel backgrounds, sidebar, main workspace containers. |
| `--surface-2` | `#18181b` | Lifted Panel | Cards, modals, elevated content areas. |
| `--border` | `#27272a` | Obsidian Edge | All borders and dividers. 1px only. |
| `--text` | `#f5f5f5` | Primary Ink | Body text, headings, interactive labels. |
| `--text-2` | `#a1a1aa` | Secondary Ink | Metadata, timestamps, placeholders, secondary labels. |
| `--text-3` | `#71717a` | Tertiary Ink | Disabled states, ghost text, tertiary metadata. |

### Semantic Signals

| Token | Value | Workflow Name | Carries |
|---|---|---|---|
| `--accent` | `#b8ff5a` | Phosphor Green | Primary action, active state, brand anchor. Never semantic state. |
| `--purple` | `#a78bfa` | Analysis Violet | AI analysis triggers, AI-generated content indicators. |
| `--cyan` | `#67e8f9` / `#22d3ee` | Generation Cyan | Test case generation, export actions, build triggers. |
| `--green` | `#22c55e` | Approval Green | Approved status, passed tests, confirmed states. |
| `--amber` | `#fbbf24` | Risk Amber | Needs clarification, warnings, risk annotations. |
| `--red` | `#f87171` | Rejection Red | Rejected status, critical errors, destructive confirmations. |

Each semantic signal has a `*-bg` (tinted background at ~9–10% opacity) and `*-border` (tinted border at 30–45% opacity) variant for container states: badges, callouts, workflow panels.

**Color as sole carrier rule:** color is never the only signal for state. Every badge pairs color with a text label. Every status pairs color with an icon or label. This is both an accessibility requirement (WCAG 2.2 AA) and a design constraint.

---

## Typography

**Sans:** Inter (`--font-sans`). Loaded via Google Fonts. Used for all prose, labels, headings, metadata.

**Mono:** JetBrains Mono (`--font-mono`). Loaded via Google Fonts. Used for: step numbers in test case flows, BDD syntax blocks (Given / When / Then), test identifiers, code snippets, technical labels. The mono font is a precision signal — its presence tells the user "this is technical content."

### Scale

| Name | Size | Weight | Usage |
|---|---|---|---|
| Display | `clamp(1.75rem, 5vw, 4rem)` | 800 | Hero headings, empty state numbers, large metric values |
| Heading 1 | `1.5rem` | 700 | Page titles |
| Heading 2 | `1.125rem` | 600 | Section headings, panel titles |
| Body | `1rem` | 400 | All prose content |
| Small | `0.875rem` | 400 / 500 | Metadata, secondary labels, list item details |
| XS / Caption | `0.75rem` | 400–500 | Timestamps, badges, mono step numbers |

**Line length:** cap prose at 65–75ch. Workspace panels that flex wider are fine; never allow body-copy columns to go full-width on large viewports.

**Letter spacing:** body and headings at default tracking. Mono content at default tracking (JetBrains Mono is already optimized). No wide-tracked all-caps kickers.

---

## Elevation

Three glass levels + glow. Depth is material, not stacked paint: every elevated surface lets the particle field breathe through it, then separates itself with blur, a 1px inner highlight, and a calibrated shadow.

| Level | Token | Character | Use |
|---|---|---|---|
| 0 | `--bg` | Void | Body, WebGL particle canvas, page root |
| 1 | `--glass-bg-1` + `--glass-blur-sm` | Frosted Shell | Sidebar, workspace containers, auth/welcome panels |
| 2 | `--glass-bg-2` + `--glass-blur-md` | Instrument Glass | Cards, list groups, inline editors, review panels |
| 3 | `--glass-bg-3` + `--glass-blur-lg` | Command Glass | Modals, popovers, command surfaces, focused overlays |
| Highlight | `--glass-border-highlight` | Catchlight | 1px inner edge that proves the surface is glass |
| Shadow | `--glass-shadow` | Contact Depth | Soft contact shadow only where a glass plane needs separation |

**Philosophy:** elevation is achieved through translucency and optical separation, not solid surface stepping. Level 1 is transparent enough to belong to the room. Level 2 increases tint and blur so workflow content reads as a usable instrument. Level 3 is the most opaque and blurred because it interrupts the task and must stay legible over motion. `--surface-1` and `--surface-2` remain compatibility tokens during rollout but are superseded by glass backgrounds for new work.

**Hover mechanics:** list rows translate `2px` right on hover. Glass panels may tilt within `--tilt-max-deg` and deepen to the next depth token on hover/focus. Buttons brighten slightly. These are physical metaphors for "this responds to you" — calibrated, not decorative.

---

## 3D & Depth

The WebGL particle background is environmental, not content. It sits behind every route, including auth and welcome, at the bottom of the stacking order. Particles must stay low contrast, sparse, and slow enough that text remains WCAG 2.2 AA over glass. They may respond to cursor position with subtle parallax, but they never compete with badges, status colors, focus rings, or primary actions.

CSS 3D tilt is reserved for glass panels that behave like instruments: metric cards, review panels, command surfaces, and auth/welcome cards. Tilt uses `--perspective`, caps rotation at `--tilt-max-deg`, and animates with `--dur-tilt` on `--ease-out-quart`. Cursor-follow depth uses `--dur-parallax` on `--ease-out-quint`; it may move the background field and glass highlights, not text baselines or form controls.

**Mandatory fallbacks:** under `prefers-reduced-motion: reduce`, disable WebGL animation loops, cursor-follow parallax, and panel rotation; keep the final visual as a static particle frame or flat dark background with the same glass tint, border, and text contrast. On low-end/mobile devices, reduce particle count, disable CSS 3D tilt, keep `backdrop-filter` optional, and fall back to the matching translucent background plus `--glass-border-highlight`. Motion tokens must never be required to understand state; reduced motion receives instant state changes or a simple opacity crossfade.

---

## Components

### Button

Seven semantic variants, each with a dedicated surface + glow role.

| Variant | bg | text | border | hover glow | Use |
|---|---|---|---|---|---|
| Primary | `--accent` | `#0a0a0a` | — | `--accent-glow` | Main CTA, save, confirm |
| Secondary | `--surface-2` | `--text` | `--border` | `rgba(255,255,255,0.06)` | Cancel, back, secondary actions |
| Danger | `--red-bg` | `--red` | `--red-border` | `rgba(248,113,113,0.15)` | Delete, destructive confirmations |
| Analysis | `--purple-bg` | `--purple` | `--purple-border` | `rgba(167,139,250,0.18)` | Trigger AI analysis |
| Generate | `--cyan-bg` | `--cyan` | `--cyan-border` | `rgba(34,211,238,0.15)` | Generate test cases |
| Approve | `--green-bg` | `--green` | `--green-border` | `rgba(34,197,94,0.15)` | Approve, mark passed |
| Clarify | `--amber-bg` | `--amber` | `--amber-border` | `rgba(251,191,36,0.12)` | Flag for clarification |

Shape: `border-radius: 8px`. Padding: `0.5rem 1rem` (standard), `0.4rem 0.85rem` (compact). Transition: `background 150ms var(--ease), box-shadow 150ms var(--ease)`.

Primary button uses `color: #0a0a0a` (Void Black on Phosphor Green) — not white. The contrast at this pairing is 10.5:1.

### Badge / Chip

Compact semantic label with tinted background and matching border. Used for test case status, user roles, export formats.

Shape: `border-radius: 6px`. Font: `0.75rem`, weight 500, JetBrains Mono for test identifiers, Inter for status labels. Always pair color with a text label. Never use a colored badge without text.

### Input / Field

`background: var(--surface-2)`. `border: 1px solid var(--border)`. `border-radius: 8px`. `color: var(--text)`.

Focus state: `border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--accent-bg)`. The phosphor green ring on focus is the primary affordance that "this field is active."

Placeholder: `--text-3`. Never use `--text-2` or lighter for placeholders — the 4.5:1 contrast floor still applies.

### Sidebar Nav Item

Full-width row with `padding: 0.6rem 0.85rem`. Active state: `background: var(--accent-bg)`, `color: var(--accent)`, left-flush phosphor. Hover: `background: rgba(255,255,255,0.04)`, `translateX(2px)` on the inner content.

Never use a `border-left` stripe for the active indicator. The background tint + text color shift is the full active signal.

### List Row

Standard content row: `padding: 0.85rem 1rem`. `border-bottom: 1px solid var(--border)`. Hover: `background: rgba(255,255,255,0.03)`, inner content `translateX(2px)`.

Row structure: leading label (body weight 500), trailing metadata (small, `--text-2`), optional trailing badge. Use `display: flex; align-items: center; gap: 0.75rem`.

### Metric Card

`background: var(--glass-bg-2)`. `backdrop-filter: var(--glass-blur-md)`. `border: 1px solid rgba(255,255,255,0.055)`. `box-shadow: var(--glass-border-highlight)`. `border-radius: 10px`. `padding: 1.25rem`.

Hover: `translateY(-2px)` + bounded tilt up to `--tilt-max-deg` + `box-shadow: var(--glass-shadow)`. Display number uses the display scale (weight 800). Label below in `--text-2` at small size.

No gradient fills. No hero-metric template (big number + tiny label + supporting stats grid). Metric cards are used sparingly, for dashboard summary only.

### Export Format Card

Distinct from metric cards. Used in the export selection UI. `border-radius: 8px`. Carries a format badge (Phosphor Green for primary formats, cyan for dev-tool formats like Playwright/Postman).

Selected state: `border: 1px solid var(--accent-border)` + `background: var(--accent-bg)`.

### BDD / Code Panel

`background: var(--surface-1)`. `border: 1px solid var(--border)`. `border-radius: 10px`. `font-family: var(--font-mono)`. `font-size: 0.875rem`. `line-height: 1.7`.

BDD keywords (Given / When / Then / And) rendered in `--accent` or `--cyan`. Step body in `--text`. This panel is a precision zone — monospace is non-negotiable here.

### State Message

Inline notification for workflow events (analysis complete, generation failed, action blocked).

`background: semantic-bg`. `border: 1px solid semantic-border`. `border-radius: 8px`. `padding: 0.85rem 1rem`.

No `border-left` stripe. The full border and background tint carry the state — the stripe is explicitly banned.

---

## Do's and Don'ts

### Do

- Use `--glass-border-highlight` (1px) as the glass edge. Thicker borders read as decorative.
- Use `--glass-bg-1`, `--glass-bg-2`, and `--glass-bg-3` for new foundation work; solid `--surface-*` tokens are rollout compatibility only.
- Use JetBrains Mono for all step numbers, identifiers, BDD blocks, and code — even if the surrounding layout is Inter.
- Apply `translateX(2px)` for list row / nav item hover — it's the consistent spatial metaphor for "this responds."
- Apply `translateY(-2px)` or bounded panel tilt for glass hover — the complementary metaphor for elevation feedback.
- Use `fadeInUp` (opacity + translateY) for entrance animations on lists and page content.
- Pair every semantic color badge with a text label.
- Use `var(--accent-bg)` + `var(--accent-border)` for selected / active container states (not solid accent fill).
- Respect `prefers-reduced-motion`: disable WebGL animation loops, cursor-follow parallax, and panel rotation; replace transform-heavy transitions with a simple `opacity` crossfade or instant state.

### Don't

- `border-left` or `border-right` wider than 1px as a colored accent. Use background tint + full border instead.
- `background-clip: text` with gradients. All text is solid color.
- Use semantic colors (violet, cyan, green, amber, red) outside their workflow meaning. Analysis Violet on a primary button, for example, is a category error.
- Nest glass cards inside glass cards. Elevation has three glass levels; going deeper than `--glass-bg-3` has no token and no visual logic.
- Use generic drop shadows for elevation. Only `--glass-shadow` is allowed for structural contact depth.
- Use wide-tracked uppercase eyebrows above sections. No kicker-per-section scaffolding.
- Add the primary font at bold in places where the hierarchy calls for `--text-2` color reduction instead. Color reduction is lighter than weight increase for secondary content.
- Let phosphor green appear on a dark surface without clear interactive intent. It must mean something: primary action, active state, or brand anchor.
- Let WebGL particles, cursor-follow depth, or tilt carry state. They are environmental feedback only; labels, icons, and semantic colors still carry workflow meaning.
