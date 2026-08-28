# UPAHAAR — Design System & Theme Reference

> **One-line summary:** UPAHAAR is a trust-first digital health wallet — a calm, clinical-but-warm interface built on a single blue accent over slate neutrals, with a WhatsApp-style deep-teal dark mode, soft elevated surfaces, and generous pill/rounded geometry.

This document is a machine-readable spec of the current product theme, extracted from the actual codebase (`frontend/public/landing.html`, `frontend/src/app/globals.css`, `tailwind.config.js`, `layout.tsx`, dashboard pages, and sidebar). Drop it into any LLM to reproduce the visual language faithfully.

---

## 1. Product context

- **Product:** UPAHAAR — "Unified Permanent Account for Healthcare Access & Authorization Registry" (Hindi *upahaar* = "a gift"). A digital health record / medical wallet for India.
- **Stack:** Next.js 14 (App Router) + Tailwind CSS 3.4 + React 18, framer-motion, lucide-react icons, recharts. Backend Express + SQLite + Supabase. Python AI services (drug-conflict check, face recognition, triage chat).
- **Roles:** `CITIZEN` (patient) and `DOCTOR` (clinician) — separate auth flows and dashboards.
- **Primary user journeys:** register → verify → one QR health card → medical timeline → vitals tracking → pharmacy finder → vaccine scheduler → doctor-side patient view.

## 2. Design principles

1. **One accent, total discipline.** A single blue (`#2563EB`) carries all meaning. Neutrals (slate) own 80%+ of the surface. No second accent color exists.
2. **Trust through softness.** Elevated white cards, large radii, blue-tinted shadows, pill buttons. The UI should feel reassuring, not sterile or flashy.
3. **Dark mode is a first-class theme**, not an afterthought — a "premium dark" like WhatsApp Web, with its own full token set persisted to `localStorage` (`upahaar_theme`) and applied via the `.dark` class on `<html>`.
4. **Gradients only where meaning exists**: brand gradient on primary CTAs and header heroes; a deep-navy gradient reserved for the security/section break.
5. **Mobile-first layout** — all app pages are responsive with a sidebar that collapses to full-width top nav on small screens.

## 3. Color system

### 3.1 Light theme tokens (light — default)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#f8fafc` | Page background (slate-50) |
| `--surface` | `#ffffff` | Cards, sheets, inputs |
| `--fg` | `#0f172a` | Primary text (slate-900) |
| `--fg-2` | `#1e293b` | Secondary headings (slate-800) |
| `--muted` | `#64748b` | Secondary text (slate-500) |
| `--meta` | `#94a3b8` | Captions, timestamps, IDs (slate-400) |
| `--border` | `#e2e8f0` | Card/border strokes (slate-200) |
| `--border-soft` | `#eef2f7` | Faint dividers |
| `--accent` | `#2563EB` | **The only accent** (blue-600) |
| `--accent-deep` | `#1E3A8A` | Gradient end, dark blue-900 |
| `--accent-soft` | `#DBEAFE` | Tinted fills, avatars, selection (blue-100) |
| `--accent-on` | `#ffffff` | Text on solid accent |
| `--accent-ink` | `oklch(0.379 0.146 265.522)` | Accent-tinted text on light surfaces (readable blue) |
| `--success` | `#16a34a` | Positive states |
| `--warn` | `#d97706` | Warning states |
| `--danger` | `#dc2626` | Destructive states |
| `--danger-soft` | `#fef2f2` | Danger tinted fills |

### 3.2 Dark theme tokens (dark — `.dark` on `<html>`)

Inspired by WhatsApp Web dark mode. Overrides light-mode utility classes with `!important`.

| Token / rule | Value | Role |
|---|---|---|
| Page background | `#0b141a` | Deep teal-black |
| Surface (cards) | `#111b21` | Elevated panels |
| Border | `#222e35` | Strokes (replaces gray-100/200/300) |
| Hover surface | `#202c33` | Hover fills (replaces gray-100) |
| Input background | `#2a3942` | Inputs, selects, textareas |
| Headings / primary text | `#e9edef` | Replaces gray-800/900 + all `h1–h4` |
| Body secondary | `#d1d7db` | Replaces gray-700 |
| Muted / meta | `#8696a0` | Replaces gray-500/600 + placeholders |
| Primary text (hero) | `#f1f5f9` | Replaces gray-900 |
| Blue tint fill | `#202c33` + blue text | Replaces `bg-blue-50` |
| Red tint fill | `#2a1a1c` / border `#551a20` / text `#f87171` | Replaces `bg-red-50/100` |
| Shadows | Deepen to `rgba(0,0,0,0.5)` | `shadow-sm` → `shadow-xl` |
| Brand gradient | `linear-gradient(to right, #1f2c34, #202c33)` + border | Replaces `from-medical-blue` gradients |
| Sidebar | `#111b21` + `border-right: #222e35` | Replaces `bg-medical-dark` |

### 3.3 Usage rules

- Accent appears at most **twice per view** (e.g. one primary CTA + one selected tab). Everything else stays neutral.
- Accent text on light backgrounds always uses `--accent-ink` (darker) or `--accent-deep`, never raw `--accent` — keeps ≥ 4.5:1.
- Text color is **never lightened on hover**; hover changes background ±6–12% lightness or elevation, never fg.
- Semantic colors only for their meaning (danger for delete/emergency, success for verified, warn for pending).
- Focus rings: `--focus-ring` (3px translucent accent).

## 4. Typography

### 4.1 Families

| Role | Stack |
|---|---|
| Display (`--font-display`) | `"Sora", "Inter", ui-sans-serif, system-ui, sans-serif` |
| Body (`--font-body`) | `"Inter", ui-sans-serif, system-ui, sans-serif` |
| Mono (`--font-mono`) | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

- **Sora** = display/headings/brand wordmark and numeric emphasis. **Inter** = all body/UI text (also the Next.js app font via `next/font/google`).
- Mono is reserved for machine identifiers: UPAHAAR IDs, timestamps, "data" captions.

### 4.2 Scale & usage (as built)

| Element | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|
| Landing hero title | `44px` | 700 | `-0.01em` | `1.0` |
| Section title | `~30px` | 700 | `-0.01em` | tight |
| Brand wordmark (nav / sidebar) | `19–20px` | 700 | `-0.01em` (nav) / `0.02em` (hc card) | — |
| Card heading | `18–19px` | 600 | 0 | — |
| Auth heading | `22px` | 700 | `-0.01em` | — |
| Body | `15–16px` | 400 / 500 | 0 | `1.5–1.6` |
| Label / button text | `13–14px` | 600 | `0.02em` | — |
| Caption / meta | `11–13px` | 400–500 | `0.01–0.08em` | — |
| UPAHAAR ID | `10–12px` mono | 400 | `0.08em` | — |

### 4.3 Typography rules

- Three-weight system: **400** read, **600** UI/emphasis, **700** display. No 800/900.
- ALL-CAPS eyebrow pills: `12px`, 600, **`letter-spacing: 0.08em`**.
- Display type carries negative tracking (`-0.01em` … `-0.02em`); body text is `0` tracking.
- Max 3 type sizes visible above the fold on any screen.
- Never `text-align: justify`. Body copy capped at `~65ch`.

## 5. Layout & spacing

- **Container:** `1200px` max-width, centered, with responsive padding.
- **Section rhythm:** 96px vertical padding for major sections; ~64–80px for app screens.
- **Spacing scale:** 4px base (4, 8, 12, 16, 24, 32, 48). Nav/card padding typically 24–28px; grid gaps 16–24px.
- **App shell:** fixed-width sidebar `64` (`md:w-64`) on the left, content fills remainder. Sidebar collapses to full-width stacked nav below `md`.
- No horizontal scroll on mobile — components reflow.

## 6. Shape & elevation

### 6.1 Radius

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | `14px` | Cards, QR boxes |
| `--radius-md` | `18px` | Larger cards |
| `--radius-lg` | `24px` | Hero cards, sections |
| `--radius-pill` | `9999px` | Buttons, tabs, chips, eyebrows |

### 6.2 Elevation (blue-tinted shadows)

| Token | Value | Used for |
|---|---|---|
| `--elev-1` | `0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)` | Resting cards, selected tab |
| `--elev-2` | `0 10px 24px -8px rgba(30,58,138,.18), 0 2px 8px rgba(15,23,42,.06)` | Floating cards, dropdowns |
| `--elev-3` | `0 24px 48px -16px rgba(30,58,138,.30), 0 8px 24px -8px rgba(15,23,42,.12)` | Featured / hero cards |

Shadows carry the accent hue (blue) — never pure black.

## 7. Motion

| Token | Value | Used for |
|---|---|---|
| `--motion-fast` | `120ms` | Micro feedback |
| `--motion-base` | `200ms` | Hover, color transitions |
| `--motion-slow` | `420ms` | Section reveals |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | The single easing curve for everything |

- Landing uses scroll-triggered reveal (`.reveal` / `.reveal.in`), respecting `prefers-reduced-motion`.
- Sidebar collapsible groups animate chevron rotation (`rotate-180`, `duration-200`).
- Notification badge uses `animate-pulse`.
- `framer-motion` is available app-wide for dashboard transitions.

## 8. Iconography

- **lucide-react**, monoline, `stroke-width: 1.8`, `round` caps/joins, `currentColor`.
- Standard icon sizes: 16px (inline/sub-nav), 20px (nav items), 42–48px (feature/step icon tiles).
- Icons sit on tinted soft backgrounds in feature lists: e.g. rose `#ffe4e6`/`#e11d48` (heart), amber `#fef3c7`/`#b45309`, green `#dcfce7`/`#15803d`, accent-soft for primary.
- Never emoji-as-icon.

## 9. Component patterns

### 9.1 Buttons
- **Primary (`.btn-primary`):** pill, `--grad-brand` (135° `accent → accent-deep`) background, white text, padding `13px 26px`, 600 weight, elev shadow. Hover deepens gradient; active darkens further; disabled desaturates.
- **Secondary/white (`.btn-white`):** white fill, `--accent-ink` text, deep shadow.
- One primary CTA per viewport; everything else ghost/text.

### 9.2 Eyebrow / section label
- Pill: soft background (`--accent-soft` light / `rgba(255,255,255,.12)` on dark), 15px 1.8-stroke SVG icon, 12px uppercase 600 `0.08em` tracking. Colors invert on dark sections (`#bfdbfe` text).

### 9.3 Cards
- White `--surface`, `1px --border`, `--radius-lg` (24px), `--elev-2`/`--elev-3`. On dark: `#111b21`, border `#222e35`.
- Health-card (`.hc-*`): gradient header with wordmark + QR placeholder box (white, radius 14px, `--elev-1`), avatar circle (58px, accent-soft), mono ID, emergency footer on `--danger-soft`.
- Feature steps: icon tile (48px, `--grad-brand`, radius 15px) above heading.

### 9.4 Role tabs (segmented control)
- Two-option pill container: `--bg` fill, `1px --border`, `--radius-pill`, 5px padding.
- Active tab: white `--surface` + `--accent` text + `--elev-1` shadow. Inactive: transparent, muted text.

### 9.5 Form fields
- Light: white, `1px --border`, radius ~10–14px. Focus: `--focus-ring`.
- Dark: bg `#2a3942`, border `#222e35`, placeholder `#8696a0`.
- Validation messages: info = `--accent-soft` bg / `--accent-ink` text; error = `--danger-soft` bg / `#b91c1c` text.

### 9.6 Sidebar (app shell)
- Light: `bg-medical-dark` (deep blue `#1E3A8A`), white text.
- Dark: `#111b21`, `border-right: 1px #222e35`.
- Nav item: `p-3 rounded-lg font-semibold`. Active = `bg-white/10 text-white`; hover = `bg-white/5`; idle = `text-gray-300`.
- Notification count badge: `bg-red-500 text-white`, `text-xs`, pill, `animate-pulse`.
- Bottom-pinned Settings item separated by `border-t border-white/10`.

### 9.7 Data & charts
- Vitals use **recharts** line/area charts with the accent color for series; charts always render filled data encoding.
- Metric chips: display font for the value, mono caption for unit/label.
- Tables/cards for records; status pills reuse semantic colors.

### 9.8 QR card (signature element)
- Central white card containing: brand row, avatar, name (19px display 700), mono UPAHAAR ID, QR placeholder in a bordered box, emergency contact strip on `--danger-soft` with `#7f1d1d` value text.

## 10. Page archetypes

1. **Landing** (`landing.html`): sticky nav → hero (eyebrow + 44px title + pills CTAs) → "Why we built this" → "How it works" (3 steps) → "What's inside" (feature grid) → live health-card mock → "Security first" (deep-navy `--grad-dark` full-bleed section, white text) → "For doctors" → FAQ → footer.
2. **Auth** (`/auth/citizen|doctor/{login,register,forgot-password}`): centered card, role-switch tabs, Google-translate widget.
3. **Citizen dashboard**: sidebar + timeline cards, QR card, vital charts, vaccine scheduler, notifications, settings.
4. **Doctor dashboard**: patient list → patient detail with full medical timeline.

## 11. Voice & content

- Tone: **trustworthy, plain, human** — institutional but warm. India healthcare framing (records "shouldn't live in a shoebox").
- Signed taglines: "Unified Permanent Account for Healthcare Access & Authorization Registry".
- Microcopy favors concrete verbs ("Start tracking", "One wallet, three simple moves") over generic "Get started".
- No invented metrics; any stat is either real or clearly a placeholder.

## 12. Implementation notes (for rebuilders)

- Tailwind `extend.colors.medical`: `blue: #2563EB`, `light: #DBEAFE`, `dark: #1E3A8A`.
- `darkMode: 'class'` — toggle `document.documentElement.classList`, persisted key `upahaar_theme`.
- Dark rules live in `globals.css` as overrides; keep them in sync with the token table in §3.2.
- Recurring Tailwind class patterns in app: `rounded-xl/2xl/3xl`, `shadow-sm/md/lg`, `bg-medical-blue`, `bg-medical-dark`, `bg-gradient-to-r from-medical-blue`.
- Keep every page responsive; no horizontal scroll below 720px.
- All colors derive from the token table — never introduce a raw hex outside these tokens.

---

*Extracted from the UPAHAAR codebase (landing page, globals.css, tailwind.config.js, app components). Treat this file as the source of truth for any redesign or rebuild.*
