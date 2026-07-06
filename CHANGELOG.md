# Changelog

All notable changes to Aperio-J are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.2.0] — 2026-07-06

### Added

- Tech role categories (`frontend-dev`, `backend-dev`, `devops`, `data-ml`, etc.) for remote profiles
- Remote tech feed quality filter — excludes ghostwriter, admin assistant, and other non-tech remote noise
- Profile location display shows **Remote** when no city tags are set
- Spanish (`es`) UI locale template and engine locale pack
- Global background match refresh (survives navigation)
- Related jobs on opportunity detail pages
- Profile quick-intent presets (remote developer, digital nomad, etc.)
- OPML import, enable-all sources, stream feed cache
- `CHANGELOG.md` for release notes

### Fixed

- **Sources → Enable all** no longer drops API connector rows (Remotive, RemoteOK, etc.) from the table
- Profile context bar uses all city tags, not only `primaryCity`
- Web build/typecheck no longer picks up stale `.next/dev` validator types

### Changed

- **English is the default UI and engine locale** for new visitors (`en`; `zh-CN` and `es` remain available)
- CI rolling release notes are English-first
- Product positioning: remote-first tech / nomad matching (factory vertical retained but not primary UX)

## [0.1.0] — 2026-07-06

### Added

- Remote-first job discovery for tech professionals, freelancers, and digital nomads
- Profile-driven matching with explainable scores (intent, capability, trust, geo)
- Multi-source intake: API connectors, RSS, scraped boards, custom URLs, paste-to-capture
- Remote board registry (We Work Remotely, Remote OK, Remotive, Himalayas, HN Hiring, …)
- Optional city tags for hybrid local + remote discovery
- Desktop (Windows) and Android installers via CI
- UI locales: English, 简体中文
