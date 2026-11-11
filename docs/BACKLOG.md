# Proposed GitHub issue backlog

These are intended to become separate issues once a repository exists. P0 is launch-blocking; P1 follows a stable end-to-end journey.

## P0

1. **[P0][setup] Bootstrap React/Vite/TypeScript + Cloudflare Worker** - SPA/API in one deployable project; staging URL works.
2. **[P0][data] Implement D1 schema and seed booth** - Migrations, safe public projection and sample records.
3. **[P0][frontend] Build responsive booth directory and search** - Company/category/booth code search, empty/error/loading states.
4. **[P0][map] Build original hall map + accessible list** - Scalable coordinates, markers, touch/keyboard navigation.
5. **[P0][frontend] Build booth modal and deep-link page** - Pitch, website, external Meet link, direct sharing.
6. **[P0][backend] Implement secure booth submission** - Validate form, verify Turnstile, rate limit, deduplicate, pending state.
7. **[P0][admin] Implement moderation and booth placement** - Authenticated review, approve/reject/hide, position editing.
8. **[P0][security] Define verified editing/recovery flow** - Token hash, delivery or moderator-controlled changes, revocation.
9. **[P0][legal] Add clear independent-event/privacy notices** - No unauthorized map/assets, contact and takedown path.
10. **[P0][qa] Test mobile meeting handoff and abuse scenarios** - iOS/Android, keyboard fallback, invalid URLs, hidden data leaks.

## P1

11. **[P1][map] Moderator click-to-place booth positions** - Avoid manual coordinate entry.
12. **[P1][availability] Add manual availability state with TTL** - Show active only while exhibitor confirms presence.
13. **[P1][analytics] Add minimal privacy-reviewed counters** - Measure booth openings and outbound joins.
14. **[P1][ops] Define rollback, backup and sunset policies** - Clear retention, deletion and incident plan.
