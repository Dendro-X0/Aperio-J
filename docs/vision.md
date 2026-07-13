# aperio-j vision

aperio-j is a **remote-first and gig-friendly job discovery engine** — for people who want flexible, location-independent work (remote ops, e-commerce, live stream, customer support, content, tech, and contract gigs). It finds signals in public remote feeds, indexes them against what a person can do and wants to do, and surfaces explainable matches.

---

## What it is

| Term | Meaning |
|------|---------|
| **Opportunity** | A structured job signal from a feed — listing, forum post, RSS item — deduplicated and classified |
| **Seeker profile** | Work history, skills, constraints, and questionnaire intent — the matching haystack |
| **Match** | Algorithmic score + human-readable explanation — not a black box |

The product answers:

> *Given what I've done, what I want, and whether I work remotely — which opportunities in my feeds are worth looking at?*

It does **not** answer:

> *How do I get hired?* (interview prep, networking automation, resume SEO farms)

---

## Primary audience (2026)

| Audience | Default intake |
|----------|----------------|
| Remote ops / gig seekers | `global-remote` RSS + API connectors; ops/live-stream/support roles |
| Remote developers, designers | Same boards + tech role filtering |
| Digital nomads / freelancers | Remote-only; contract + part-time employment types |
| Hybrid seekers | City tags + remote boards (remote scanned first) |
| CN on-site only (legacy) | Local aggregators + paste-to-capture — opt-in via **on-site only** |

---

## Relationship to Aperio

| Aperio (closed-source, personal) | aperio-j (OSS) |
|--------|----------|
| Freelance/gig focus for maintainer use | Remote + gig **employment** discovery for a broader audience |
| GitHub repos → portfolio | Work history + skills + questionnaire → evidence artifacts |
| Maintainer's private workflow | Public product with honest scope limits |

Shared DNA: **feed-first intake**, **deterministic matching**, **explainable scores**, **trust/red-flag layer**, **no LLM required for core path**.

---

## Relationship to Indeed / Work Best

Indeed and Work Best aggregate listings. aperio-j:

1. **Aggregates from streams you configure** — remote RSS, API connectors, capture URLs
2. **Matches from the seeker's profile outward** — not keyword search inward
3. **Surfaces trust signals** — direct hire vs labor agency, scam patterns
4. **Never ranks by payment** — no sponsored slots

---

## Design principles

1. **Remote-first** — default profile is remote-only; city is optional
2. **Gig-friendly** — part-time and contract types are first-class
3. **Algorithmic-first** — core match path does not require an LLM
4. **Explainable** — every score decomposes into intent, capability, trust, geo
5. **User-owned intent** — questionnaire defines wants/avoid; system does not guess
6. **Honest scope** — does not promise CN App-ecosystem scraping from overseas cloud

---

## Honest scope (2026)

| Good fit | Poor fit |
|----------|----------|
| Remote ops, support, content, tech from RSS/API boards | Replacing BOSS/智联 for non-technical CN users |
| Profile-shaped matching with explanations | Zero-config CN full-time scrape from Render |
| Hybrid: remote boards + optional on-site (China IP) | Blue-collar CN hiring via WeChat intermediaries |
| Self-hosted; paste job links as supplement | Portfolio padding for the maintainer |

For indie developer clue discovery, the maintainer uses **private Aperio** — different product, same feed-first DNA.

---

## Terminology

| Term | Meaning |
|------|---------|
| Evidence artifact | One unit of proof — a job history entry, skill block, certificate |
| Search intent | What to pursue and avoid |
| Stream | A poll target — RSS URL, API connector, list page |
| Role category | Classified job type — ops, QC, warehouse, dev, … |

**Last updated:** 2026-07-13
