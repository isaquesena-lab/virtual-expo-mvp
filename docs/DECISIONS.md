# Decision log

## Accepted direction (2026-11-10, from initial discussion)

| ID | Choice | Reason |
| --- | --- | --- |
| D-001 | Independent, mobile-first virtual booths | Unblocks exhibitor/visitor conversations fast |
| D-002 | React + Vite + TypeScript | Thin client with fast static deployment |
| D-003 | Cloudflare Workers Static Assets + Worker API | One deployable service, no server fleet |
| D-004 | Cloudflare D1 | Small relational metadata store |
| D-005 | External Google Meet URL per booth | Avoid custom video and authentication integrations |
| D-006 | Public read access; moderated exhibitor registration | Lower visitor friction, reduce impersonation |
| D-007 | Original map/grid unless reuse permission is obtained | Avoid licensing and data sourcing problems |

Accepted direction is a project proposal; exact API and release criteria remain reviewable.

## Pending before public launch

| ID | Open question | Suggested default | Owner |
| --- | --- | --- | --- |
| Q-001 | Repository owner and collaborators? | Personal private repo initially, transfer later if needed | Project lead |
| Q-002 | Official map or independent graphic? | Independent hall graphic | Product/legal |
| Q-003 | How to verify exhibitor ownership? | Human review + verified email where possible | Operations |
| Q-004 | Who moderates submissions during the event? | Named on-call moderator | Operations |
| Q-005 | How are edit tokens delivered/recovered? | Verified email or moderator-managed edits | Engineering |
| Q-006 | Will a logo upload be needed? | No, external vetted URL or omit | Product |
| Q-007 | Which domain and sunset/retention date? | Dedicated temporary domain; retention policy | Product/legal |
| Q-008 | Expected peak traffic? | Load test and verify platform quotas | Engineering |

See the architecture ADRs under `docs/adr/`.
