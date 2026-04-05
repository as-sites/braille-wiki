# Build Order — Braille Documentation Platform

## Overview

This directory contains 14 technical build plans for implementing the Braille Documentation Platform. Plans are ordered by dependency — each plan lists what must be completed before it and what it unblocks.

## Reference Documentation

Before starting any plan, read the relevant design docs in `plans/`:

- `plans/project-instructions.md` — Architecture overview, design rationale, editorial workflow
- `plans/tech-stack.md` — All packages, monorepo structure, directory layout
- `plans/routes.md` — Complete route map for all three services + MCP tools
- `plans/database-schema.md` — All tables, indexes, key queries, ER diagram

## Dependency Graph

```
01 Monorepo Scaffolding
 ├── 02 Database Package
 │    ├── 03 Shared Packages
 │    │    ├── 04 OpenAPI Spec
 │    │    ├── 07 Editor + BrailleBlock ──► 08 Publish Flow ──► 10 Public Docs Site ──► 14 Infrastructure
 │    │    ├── 10 Public Docs Site
 │    │    └── 13 Admin UI Shell
 │    ├── 04 OpenAPI Spec
 │    │    ├── 06 API Core
 │    │    └── (all feature plans reference the spec)
 │    ├── 05 Auth
 │    │    ├── 06 API Core
 │    │    ├── 11 Media
 │    │    ├── 12 MCP Server
 │    │    └── 13 Admin UI Shell
 │    ├── 08 Publish Flow
 │    └── 09 Search
 └── (all plans)
```

## Build Order (Recommended Sequence)

| Phase | Plan | Title | Prerequisites | Unblocks |
|-------|------|-------|---------------|----------|
| **Foundation** | 01 | Monorepo Scaffolding | None | All |
| | 02 | Database Package | 01 | 03, 04, 05, 06 |
| | 03 | Shared Packages | 01, 02 | 04, 06, 07, 08, 10, 13 |
| | 04 | OpenAPI Spec | 02 | 06, 07, 08, 09, 10, 11, 12, 13 |
| **Core** | 05 | Auth | 01, 02 | 06, 07, 10, 11, 12, 13 |
| | 06 | API Core | 02, 03, 04, 05 | 07, 08, 09, 10, 11, 12, 13 |
| **Features** | 07 | Editor + BrailleBlock | 03, 04, 05, 06 | 08 |
| | 08 | Publish Flow | 02, 03, 06, 09 | 10 |
| | 09 | Search | 02, 06 | 08, 10 |
| **Parallel batch** | 10 | Public Docs Site | 02, 03, 08 | 14 |
| | 11 | Media | 05, 06, 07 | — |
| | 12 | MCP Server | 05, 06 | — |
| | 13 | Admin UI Shell | 03, 05, 06, 07 | — |
| **Final** | 14 | Infrastructure | 06, 10 | — |

## Parallelization Opportunities

These plans can be worked on simultaneously once their prerequisites are met:

- **After 06 completes:** 07, 09, 11, 12 can all start in parallel
- **After 07 completes:** 08, 11, 13 can proceed in parallel
- **After 08 completes:** 10 can start; 11, 12, 13 may already be in progress

## Notes

- Each plan is self-contained with its own package list, deliverables, and verification steps
- Plans reference relative paths within this monorepo
- The OpenAPI spec (plan 04) is a contract document — the API implementation (06) and client generation (07) both depend on it
- better-auth manages its own `/api/auth/*` routes; the OpenAPI spec covers only custom routes
