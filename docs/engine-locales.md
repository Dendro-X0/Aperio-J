# Engine locale packs

Match explanations, exclusion reasons, red-flag labels, and caution strings are loaded from JSON catalogs in `@aperio-j/core`. Detection **patterns** (regex, city lists, role rules) stay in TypeScript; only **display text** is localized so communities can ship alternate packs without forking matcher logic.

## Files

```
packages/core/locales/
  zh-CN.json   # default
  en.json
```

Published paths (for forks and overlays):

- `@aperio-j/core/locales/zh-CN.json`
- `@aperio-j/core/locales/en.json`

After `pnpm --filter @aperio-j/core build`, catalogs are copied to `packages/core/dist/locales/` and `dist/taxonomies/` for Node consumers. Runtime code imports bundled JSON from `src/catalogs/` (synced from those folders at build) so Next.js and other bundlers never pull in `node:fs`.

## Schema

Top-level keys:

| Key | Purpose |
|-----|---------|
| `meta.locale` | BCP-47-ish code (`zh-CN`, `en`) |
| `meta.version` | Pack version for community extensions |
| `listSeparator` | Join intent/capability hits (`、` vs `, `) |
| `sentenceSeparator` | Join explanation clauses (`；` vs `; `) |
| `explanationSuffix` | Trailing punctuation (`。` vs `.`) |
| `cautionSeparator` | Join cautions inside “Caution: …” |
| `redFlags.{id}` | Label for each `RED_FLAG_PATTERN_RULES` id |
| `matcher.exclusion.*` | Hard-gate exclusion messages |
| `matcher.notRecommended` | `{reason}` wrapper for excluded rows |
| `matcher.explanation.*` | Positive match explanation templates |
| `matcher.caution.*` | Feedback / trust cautions |

Placeholders use `{name}` syntax (e.g. `{phrase}`, `{flags}`, `{hits}`).

## API

```typescript
import {
  createEngineTranslator,
  resolveEngineLocale,
  loadEngineCatalog,
} from "@aperio-j/core";

const translator = createEngineTranslator("en");
translator.t("matcher.exclusion.locationOutOfRange");
translator.t("matcher.exclusion.avoidPhrase", { phrase: "sales" });
translator.joinList(["QC", "warehouse"]);
```

Packages accept `locale?: EngineLocale | EngineTranslator`:

- `@aperio-j/discovery` — `parseOpportunity`, `detectRedFlagTiers`, `localizeOpportunity`
- `@aperio-j/matcher` — `scoreOpportunity`, `partitionOpportunityMatches`, `rankOpportunities`

The web app passes the UI cookie locale into `runMatchPipeline` / `loadLatestInbox`. Cached match runs are **re-scored** on read so switching zh-CN ↔ en updates explanations without a full RSS refetch.

## Adding a locale

1. Copy `zh-CN.json` → `locales/{code}.json` and translate string values only.
2. Register the file in `packages/core/src/locale/load-catalog.ts` (`CATALOG_FILES` + `EngineLocale` type).
3. Add the UI catalog in `apps/web/src/i18n/messages/` if the web shell should offer the locale.

Keep regex and classification logic unchanged unless the target market needs different **patterns** (separate roadmap item: community probe-packs per locale).

## Community extensions

Forks can override catalogs by:

- Replacing JSON under `packages/core/locales/` before build, or
- Pointing `loadEngineCatalog` at an external directory (future: env var `APERO_J_LOCALE_DIR`).

Rule ids in `redFlags` must match `RED_FLAG_PATTERN_RULES` in `@aperio-j/discovery` — add new patterns in code first, then add labels for each locale.
