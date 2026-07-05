# aperio-j vision

aperio-j is a **discovery engine for employment opportunities** with an operational workflow (onboarding → daily matches → apply/track). It finds signals in public feeds, indexes them against what a person can do and wants to do, and surfaces explainable matches.

---

## What it is

| Term | Meaning |
|------|---------|
| **Opportunity** | A structured job signal from a feed — listing, forum post, RSS item — deduplicated and classified |
| **Seeker profile** | Work history, skills, constraints, and questionnaire intent — the matching haystack |
| **Match** | Algorithmic score + human-readable explanation — not a black box |

The product answers:

> *Given what I've done, what I want, and what I won't accept — which opportunities in my city/feeds are worth looking at?*

It does **not** answer:

> *How do I get hired?* (interview prep, networking automation, resume SEO farms)

---

## Relationship to Aperio

| Aperio | aperio-j |
|--------|----------|
| GitHub repos → portfolio | Work history + skills + questionnaire → evidence artifacts |
| Project / OSS / contract leads | Full-time / part-time employment |
| `employment` mode penalized | Employment is the primary target |
| Buyer in a thread | Employer hint + poster type (direct vs agency) |
| Capability from code | Capability from experience + transferable skill rules |

Shared DNA: **feed-first intake**, **deterministic matching**, **explainable scores**, **trust/red-flag layer**, **no LLM required for core path**.

---

## Relationship to Indeed

Indeed aggregates listings and sells visibility. aperio-j:

1. **Aggregates from streams you configure** — public RSS, local boards, forums, capture URLs
2. **Matches from the seeker's profile outward** — not keyword search inward
3. **Surfaces trust signals** — direct hire vs labor agency, scam patterns
4. **Never ranks by payment** — no sponsored slots

---

## Design principles

1. **Algorithmic-first** — core match path does not require an LLM
2. **Explainable** — every score decomposes into intent, capability, trust, geo
3. **User-owned intent** — questionnaire defines wants/avoid; system does not guess
4. **Vertical-first, engine-second** — best results when probe packs match the user's labor market (GD manufacturing today; remote tech as a supplement). See [discovery-reset.md](./discovery-reset.md).
5. **Introvert-friendly** — discovery is passive; no required networking or posting
6. **Trust-aware** — labor-agency exploitation patterns are first-class (especially CN manufacturing context)
7. **Local-first** — SQLite on device; self-hosted; no mandatory cloud account (see [platform-vision.md](./platform-vision.md))
8. **User-owned streams** — auto-discovery plus manual URL add, like Aperio information streams

## Honest scope (2026)

| Good fit | Poor fit |
|----------|----------|
| GD/SZ manufacturing & service jobs from public portals | Replacing Boss直聘 / Indeed for volume |
| Remote tech via RSS boards (supplement) | LinkedIn/Indeed login-gated scraping |
| Labor-agency red-flag triage (CN) | Generic "smart job app" for any city worldwide |
| Self-hosted, privacy-preserving matching | Tech-community OSS showcase without vertical focus |

For indie developers and B2B clue discovery, use **[Aperio](https://github.com/Dendro-X0/Aperio)** — different product, same feed-first DNA.

---

## Terminology

| Term | Meaning |
|------|---------|
| Evidence artifact | One unit of proof — a job history entry, skill block, certificate |
| Search intent | What to pursue and avoid — like Aperio's discovery profile |
| Stream | A poll target — RSS URL, forum section, list page. Optional [session auth](authenticated-streams.md) for login-walled **custom** sources only |
| Poster type | `direct` (company) vs `agency` (labor broker) vs `unknown` |
| Role category | Classified job type — production line, QC, warehouse, sales, … |

**Last updated:** 2026-07-03
