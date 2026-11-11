# ADR 0002 - Original virtual hall instead of copied event map

Status: Proposed / default until permission is obtained
Date: 2026-11-10

## Context

Visitors want familiar wayfinding, but an official event floorplan and exhibitor dataset may be proprietary, restricted or unavailable.

## Decision

Launch with an original SVG hall or category-based grid. Positions are zone plus x/y percentages. Provide a searchable list fallback. Only reuse official maps or branding after a documented permission and reliable licensed data source.

## Consequences

- Fast and accessible implementation without an external map SDK.
- Original booth positions may not match the physical venue.
- Exhibitors can display their physical booth code separately, without claiming that the virtual position reproduces the official floorplan.
