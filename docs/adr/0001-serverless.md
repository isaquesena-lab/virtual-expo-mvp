# ADR 0001 - Single serverless web application

Status: Proposed / direction accepted for MVP
Date: 2026-11-10

## Context

A virtual booth directory is needed urgently, with low operational overhead and modest transactional data. Live video is delegated to an existing conferencing service.

## Decision

Build a React/Vite SPA and JSON API deployed together on Cloudflare Workers, backed by D1. Use Turnstile for public form verification. Meetings remain external links.

## Consequences

- Low service count; fast deployment and rollback.
- Must monitor provider quotas and runtime limits during traffic spikes.
- D1 migrations and rollback process must be tested.
- Avoid complex auth, WebSockets and multimedia workloads at launch.

## Alternatives not selected

- Next.js SSR: adds deployment/build complexity without meaningful product benefit.
- Monolithic VM/PostgreSQL: more operations for this limited scope.
- Own WebRTC infrastructure: disproportionate cost and complexity.
