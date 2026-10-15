# SetRepRest — UI/UX Design

## Design language — "graphite"

Rewritten 2026-10-15 after a study of Linear's and Vercel Geist's dark systems and
Hevy-style set logging. Principles, in priority order:

1. **Elevation is a surface ladder, never shadows.** Page `#0a0b0d` → panel
   `#101214` → raised `#17191d` → hover `#1e2126` (dark theme). Light theme mirrors
   with `#f7f7f8` / white / `#f0f0f2`.
2. **Solid hairline borders, drawn once.** `--app-line` for structure, `--app-line-strong`
   for interactive emphasis. No stacked alpha borders, no tinted washes.
3. **Small radii.** 6px controls, 8px inputs/buttons, 10px panels. Nothing more.
4. **One accent, spent sparingly.** Lime is reserved for: the primary CTA, the
   completed-set check, the active-tab indicator, the chart series, and the PR
   microlabel. Never as background washes or decorative borders.
5. **Typography leads.** Page titles 15px/semibold/tracking-tight; section headers
   13px; data 13px tabular numerals (`.tnum`); metadata is the uppercase
   `.microlabel` voice (10px, 0.08em tracking). Weight and size carry hierarchy,
   not color.
6. **Dense lists over padded cards.** Repeating rows live in ONE bordered panel
   separated by `divide-y` dividers (library, history). Only true objects get their
   own panel (an exercise card in a workout).
7. **Motion:** 150ms color transitions only; `prefers-reduced-motion` collapses all.

## Anti-slop checklist (verify before shipping any screen)

- No accent background washes behind text (use raised surface + accent text).
- No dashed borders on actionable buttons.
- No radius above 10px, no glassmorphism/blur panels, no gradient fills.
- No emoji as icons; inline stroke SVGs at 1.7–2.2 stroke width.
- Text never sits on the accent color; accent ink is always the dark token.

## Key screens

### Home
- "Where are you training?" gym card row (selected = accent border + raised surface).
- Primary CTA h-12; template quick-start chips (h-7, 6px radius).
- "Last workout" row and 4-week volume bars — typographic, no vanity tiles.

### Active workout (/workout)
- Sticky dense header: name (tap to rename) · elapsed chip · pause.
- Exercise panel: 13px semibold header, tnum meta line, column labels
  SET / WEIGHT / REPS / DONE over Hevy-style rows; warm-up/drop sets marked with a
  9px W/D letter, not a pill.
- Rest: fullscreen focus overlay — dimmed blurred backdrop, large countdown ring,
  +15s / Skip controls, tap-anywhere-to-skip.

### Progress
- Verdict panel (accent text only when improving), 3 stat tiles, then chart panels.
- Multi-series strength chart uses the validated 4-hue chart palette
  (`--app-chart-1..4`), legend below, no dual axes.
- Library: one divided panel of rows; search h-9; filter chips h-7.

### History / Session detail
- History rows replicate the reference pattern: raised date tile (weekday micro +
  big day number), name + `Oct 14 · 1h 3m · 16 sets` meta line, compact volume
  (8.3k) with unit under, chevron. Grouped under `WEEK OF OCT 5` microlabels.
- Session detail keeps the set tables with gym badge.

### Settings
- Sectioned panels with microlabel field groups; segmented controls use the
  raised-track + surface-thumb pattern.

## Interaction details

- Touch targets ≥ 36px (set-row controls) / 44px for primary actions.
- Bottom sheets on mobile, centered dialogs on desktop; Escape + backdrop close.
- Optimistic UI; destructive actions confirm via ConfirmSheet (typed "DELETE" for reset).
- Accessibility: labelled inputs, aria-live rest timer, focus-visible rings,
  contrast ≥ 4.5:1 for text, colour never the sole signal.

## Empty / loading / error states

- Typographic empty states (no illustration boxes) with the next action.
- Providers expose `status: 'loading' | 'ready' | 'error'`; loading = skeletons,
  error = retry message.
- Storage-unavailable mode disables writes with an explanation banner.
