# Frontend spec — v2 (marketplace UI)

> **Design system:** [design-system/MASTER.md](../design-system/MASTER.md) · **Redesign phases:** [ui-redesign.md](./ui-redesign.md) · **i18n:** [i18n.md](./i18n.md)

**Scope:** Local-first employment opportunity engine — Profile, marketplace inbox, signal registry.  
**Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, shadcn/ui (base-nova), `next-themes`, `@aperio-j/db`.

## Routes

| Route | Archetype | Purpose |
|-------|-----------|---------|
| `/` | redirect | → `/inbox` if onboarding complete, else `/settings` |
| `/settings` | dashboard form | Section-nav Profile → `SeekerProfile` |
| `/onboarding` | redirect | → `/settings` (legacy URL) |
| `/inbox` | marketplace browse | Search/filter loaded matches, capture |
| `/inbox/[opportunityId]` | detail dashboard | Multi-panel opportunity detail, feedback, score breakdown |
| `/sources` | registry table | Streams, health, enable toggle, discover, add URL |

All app routes render inside `(main)` layout with `AppShell` (sidebar + top bar).

## Shell (`AppShell`)

- **Desktop:** collapsible left sidebar (发现 / 我的), sticky top bar (breadcrumb, stat badges, locale, theme)
- **Mobile:** navigation via shadcn `Sheet` (left drawer); menu button `aria-expanded` + `aria-controls`
- **Skip link:** “跳到主内容” → `#main-content`
- **Theme:** light / dark / system via `next-themes`; teal `--primary`
- **Main:** `max-w-7xl`, semantic tokens (`bg-background`, `border-border`)

## Profile (`/settings`)

OBSCUR-inspired settings shell (aperio-j teal tokens): grouped secondary nav + search + single active panel.

| Nav group | Sections | Fields |
|-----------|----------|--------|
| Matching | Location, Employment, Background, Desired roles | city tags, remote preference (when cities set), employment toggles, industry/occupation tags + catalog browse, experience summary, desired roles |
| Filters | Exclusions | avoid list, production-line / sales switches |
| Trust | Trust preferences | hide red flags, prefer direct hire, allow agency postings |

- **Nav:** search filters section labels; desktop sidebar + mobile horizontal section pills; `?section=` deep link; active item uses primary inset accent; completeness bar hidden at 4/4
- **Footer:** **Save** (profile only) · **Save & refresh matches** (`runPipeline: true`) → `POST /api/profile`; first-setup wizard with Back/Next across four core sections; unsaved-changes dialog on leave

## Inbox (`/inbox`)

- **Toolbar:** search, category chips, filter sheet (poster, min score, sort), collapsible capture URL
- **Grid:** responsive `sm:2` / `xl:3` column cards; click navigates to `/inbox/[opportunityId]`
- **Detail page:** standalone multi-panel layout — match explanation, score breakdown, taxonomy, source, feedback
- **Filters:** client-side only on loaded items (`useInboxFilters`) — no new match API
- **Excluded:** toggle to show filtered items (muted grid cards)
- **Empty:** shadcn `Empty` via `PageEmpty` + CTA to settings
- **Loading:** `InboxJobCardSkeleton` × 3

API: initial load server-side; refresh `POST /api/match/run`; capture `POST /api/capture`; feedback `POST /api/inbox/feedback`.

## Sources (`/sources`)

- **Stats:** enabled count, healthy count, last discovery time
- **Toolbar:** re-discover, add URL (Dialog)
- **Table:** name, kind, region, health badge (dot), confidence, enable Switch, row menu
- **Empty / loading:** `PageEmpty`, `SourcesTableSkeleton` while discovering

API: `GET /api/sources`, `PATCH /api/sources/:id`, `POST /api/sources`, `DELETE /api/sources/:id`, `POST /api/sources/discover`.

## i18n

Locales: `zh-CN` (default), `en`. Cookie `aperio_j_locale`. UI strings in `apps/web/src/i18n/messages/`. Engine match text in `packages/core/locales/`. Structured taxonomy in `packages/core/taxonomies/nodes.json`.

**Last updated:** 2026-07-04

## Accessibility checklist

- [x] Skip to main content
- [x] Labeled form inputs (`Label` + `htmlFor`)
- [x] Icon buttons: `aria-label` (menu, theme, row actions)
- [x] Mobile nav: `Sheet` with screen-reader title
- [x] Focus rings via shadcn (`focus-visible:ring-ring`)
- [x] Loading regions: `aria-busy` + `aria-live="polite"`
- [x] Status as `Badge` components (not raw strings in chrome)
- [x] `prefers-reduced-motion` in `globals.css`

## Component map

| Area | Path |
|------|------|
| Shell | `apps/web/src/components/shell/` |
| Inbox | `apps/web/src/components/inbox/` |
| Profile | `apps/web/src/components/profile/` |
| Sources | `apps/web/src/components/sources/` |
| shadcn | `apps/web/src/components/ui/` |

**Last updated:** 2026-07-04
