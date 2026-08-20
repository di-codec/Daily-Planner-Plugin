# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-19

### Changed

- **Storage model**: replaced weekly Markdown tables (`✅Tasks`, `❤️Health Tracker`,
  `Summary.md`) with one note per day (`<root>/Daily/YYYY/MM/YYYY-MM-DD.md`),
  storing habits and schedule in frontmatter and tasks as a checklist body.
- **UI**: the planner is now a single Daily Planner panel (calendar + day plan +
  sticky current-week tracker) instead of separate weekly note files, backed
  by a small observable store so each zone re-renders independently.
- **Architecture**: split the codebase into `src/core` (pure TypeScript
  business logic, unit-tested, no `obsidian` imports) and `src/obsidian` (thin
  Vault/UI adapter). See the README's architecture section.
- Frontmatter is now parsed from plain file text instead of through
  `metadataCache`/`processFrontMatter`, removing a race between writing a
  note and reading its just-written frontmatter back.
- Writes (task/habit/schedule edits) are now debounced per file to avoid
  read-modify-write races when toggling checkboxes rapidly.
- Settings tab: added a configurable root folder alongside the existing
  custom habit list.

### Added

- One-shot **Migrate legacy Daily Planner notes** command to import old
  `✅Tasks`/`❤️Health Tracker` data into the new per-day notes (existing
  per-day notes are left untouched; old files are not deleted).
- Vitest test suite for `src/core`.
- CI workflow (lint, typecheck, test, build) on push/PR.

### Removed

- The weekly `Summary.md` generation feature and its `SummaryManager`.
- Dead pre-modal CSS and a stray build artifact directory.

## [1.0.0]

Initial release: weekly Markdown-table task/habit tracking with a
stacked-bar-chart summary.
