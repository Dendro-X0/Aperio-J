# aperio-j design system

**Scope:** `apps/web` UI — marketplace + dashboard shell.

## Accent

| Mode | Token | Value | Use |
|------|-------|-------|-----|
| Light | `--primary` | teal-600 (oklch) | shadcn primary — buttons, score ring, links |
| Dark | `--primary` | teal-400 (oklch) | Same roles on dark surfaces |
| Both | `--accent` | teal tint bg | Active sidebar item, selected chips |

Employment/trust signal — **not** startup purple or generic gray admin.

## Surface tiers

One background system; differentiate with borders and elevation only.

```
--background     Page + sidebar base (same tier)
--card           Raised panels, stat pills in header
--muted          Inset job body excerpts, profile chip bg
--border         Separators (sidebar, header, cards)
```

Avoid card-in-card-in-card nesting. One outer card per entity; body text uses `--muted` inset.

## Typography

- Stack: `system-ui`, `PingFang SC`, `Microsoft YaHei`, sans-serif
- zh-CN primary copy; en via [i18n.md](../docs/i18n.md)
- Page title: `text-2xl font-semibold` in main content
- Meta / labels: `text-sm` or `text-xs` + `--muted-foreground`

## Layout

| Token | Value | Role |
|-------|-------|------|
| `--sidebar-width` | 15rem | Expanded sidebar |
| `--sidebar-width-collapsed` | 3.5rem | Icon-only (md+) |
| `--header-height` | 3.5rem | Sticky top bar |
| Main max width | `max-w-7xl` | Marketplace browse |

## Components

| Area | Path |
|------|------|
| Shell | `apps/web/src/components/shell/` |
| Inbox marketplace | `apps/web/src/components/inbox/` |
| Profile dashboard | `apps/web/src/components/profile/` |
| Sources registry | `apps/web/src/components/sources/` |
| shadcn/ui | `apps/web/src/components/ui/` (base-nova registry) |
| Legacy primitives | `apps/web/src/components/ui/primitives.tsx` (sources/settings until Phase C/D) |
| Tokens | `apps/web/app/globals.css` |
| Theme | `next-themes`, `class` on `<html>` |

## Navigation groups

1. **发现** — 匹配机会, 信号源
2. **我的** — Profile 设置

## Status display

Always `Badge` + semantic tone — never raw status strings in UI.

## References

- [ui-redesign.md](../docs/ui-redesign.md) — phases B–E
- [i18n.md](../docs/i18n.md) — message catalogs

**Last updated:** 2026-07-04
