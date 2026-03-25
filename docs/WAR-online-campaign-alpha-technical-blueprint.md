# WAR! Online Campaign Alpha — Technical Blueprint for Codex

## 1. Executive Summary

This blueprint defines an invite-only online version of **WAR!** as a backend-authoritative asynchronous campaign platform supporting:

1. **Hybrid tabletop mode**: online app runs campaign layer while battles are played in Bolt Action (or equivalent).
2. **Standalone online mode**: online app manages strategic flow and records battle outcomes digitally, with room for future automation.

The existing spreadsheet/rulebook workflow already contains the right campaign primitives:

- territories
- ownership
- visibility / fog of war
- resources
- platoons / forces
- turns and phases
- hidden GM-only data
- reputation / intel / diplomacy
- turn logs
- player packets

The online version should preserve these concepts while moving them into a **server-authoritative domain model** with authentication, invitations, timers, audit logs, and role-safe visibility.

---

## 2. Product Strategy

### 2.1 One Domain, Two Delivery Modes

Build a shared system with:

- **Shared domain/rules core**
- **Local/Tabletop app mode**
- **Online persistent campaign mode**

This prevents rules drift.

### 2.2 Positioning

- **WAR! Tabletop Campaign**: React-first GM-assisted campaign app
- **WAR! Online Campaign Alpha**: invite-only async campaign service

The first online version should be **GM-moderated**, not fully automated.

---

## 3. Current-State Assessment

### 3.1 Existing Model Strengths

Current rules and tracker already support:

- Strategic / Operations / Resolution turn split
- secret simultaneous orders
- territory ownership + contested states
- persistent platoons
- supply / attrition / reinforcements
- hidden values (reputation, escalation)
- player-facing vs GM-only information
- visibility bands and packet generation

### 3.2 Tracker as Proto-Database

The spreadsheet already functions like a CQRS-lite system:

- **Write model** (GM sheets): Setup, Territories_Master, Forces, NPCs, Turn_Log
- **Read model** (Player_Packets): filtered projection

### 3.3 Online Gaps to Close

- authenticated users and campaign memberships
- invitations and access control
- authoritative backend state
- immutable order submissions
- backend-enforced visibility policy
- phase timers and locking
- notifications and reminders
- audit/recovery tooling
- consistent history/snapshots
- API contracts, jobs, deployment, observability

---

## 4. Recommended Stack

### Frontend

- React
- TypeScript
- Vite
- Zustand
- React Router
- TanStack Query
- shadcn/ui (or equivalent)

### Backend

- Java 21+
- Spring Boot (Web, Security, Data JPA)
- Flyway
- PostgreSQL
- Bean Validation

### Infrastructure

- Postgres
- Docker Compose (local)
- single-service deployment initially
- email provider for invites/notifications
- optional Redis later

### Realtime

- **SSE first**, WebSocket later if needed

---

## 5. Architecture Principles

1. **Backend-authoritative state** for phase, orders, visibility, resources, outcomes.
2. **Visibility as domain/auth policy**, not UI filtering.
3. **CQRS-lite**: normalized write model + role-safe read projections.
4. **History preserved** for key strategic state changes.
5. **GM moderation by design** with safe overrides.

---

## 6. Bounded Contexts

1. Identity & Access
2. Campaign Management
3. World Map / Territories
4. Forces / Platoons
5. Visibility / Fog of War
6. Orders
7. Resolution / Battles
8. Resources / Supply / Reputation
9. Research / Doctrine / Upgrades
10. Notifications
11. Audit / Event Log
12. Admin / GM Tools

---

## 7. Core Domain Entities

Primary entities to implement:

- User
- Campaign
- CampaignMember
- CampaignInvite
- Faction
- Nation
- Theatre
- Territory
- TerritoryAdjacency
- TerritoryState
- Platoon
- PlatoonState
- ResourceState
- ReputationState
- WarState
- VisibilityState
- Turn
- OrderSubmission
- PlatoonOrder
- Battle
- ResolutionEvent
- Notification
- CampaignAuditLog

Use UUIDs for external IDs.

---

## 8. Data Modeling Decisions

- Separate static-ish map/template definitions from per-campaign mutable state.
- Use snapshot + log strategy for critical state.
- Use JSONB only for flexible payloads (order payloads, validation errors, event payloads, audit diffs).
- Keep core relationships relational.

---

## 9. Rules Engine Design

Create shared module (e.g. `war-domain`) for:

- phase transitions
- order validation
- movement legality
- supply recalculation
- visibility updates
- contest detection
- battle generation
- resource collection
- reputation projection

Rules should be deterministic, test-first, and config-driven where reasonable.

---

## 10. Auth & Access Model

Campaign roles:

- GM
- PLAYER
- OBSERVER

Invite-only flow:

1. GM creates campaign
2. GM sends invite links
3. Invitee authenticates
4. Invite maps to membership
5. GM assigns faction/nation as needed

Authorization must always be backend-enforced.

---

## 11. Campaign Lifecycle

Phases:

- LOBBY
- STRATEGIC
- OPERATIONS
- RESOLUTION
- INTERTURN

Operations uses draft/save/validate/lock orders with auto-lock on timer expiry.

---

## 12. Orders System Requirements

- Player can draft continuously
- Validation feedback should exist client + server side
- Locking is explicit and immutable
- GM can unlock explicitly (audited)
- Lock timestamps + checksums stored

---

## 13. Fog of War Requirements

Visibility levels:

- UNKNOWN
- RUMOURED
- SCOUTED
- OBSERVED
- OWNED
- FULL

Never send hidden data to unauthorized clients.

---

## 14. Resolution & Battle Pipeline

1. Lock submissions
2. Reveal legal orders
3. Resolve movement conflicts
4. Determine contested territories
5. Create battle records
6. Apply non-battle outcomes where valid
7. Recompute supply and visibility
8. Publish turn summary events

Battle modes:

- TABLETOP
- AUTO
- HYBRID

---

## 15. API Design (Alpha)

Use REST (`/api/auth`, `/api/campaigns`, `/api/me`) with role-safe DTO projections.

Include endpoint groups for:

- auth
- campaigns
- invites
- membership
- map/territories
- forces
- orders
- resolution/battles
- logs/notifications
- GM admin controls

Use a consistent error envelope with stable machine codes.

---

## 16. Frontend IA (Alpha)

Essential surfaces:

- auth/invite acceptance
- campaign lobby
- player dashboard
- map + orders console
- battles + events + notifications
- GM dashboard + visibility inspector + resolution console + audit tools

---

## 17. Jobs, Observability, Recovery

Required idempotent jobs:

- phase expiry watcher
- notification scheduler
- visibility rebuild
- snapshot/export

Required instrumentation:

- structured logs (auth, invites, orders, phase changes, resolution, overrides)
- baseline metrics (active campaigns, auto-lock count, failed jobs, etc.)

Recovery/admin tools:

- force phase advance
- reopen operations
- unlock submission
- rerun resolution safely
- rebuild visibility
- export campaign snapshot

---

## 18. Test Strategy

- Unit tests for rule services and domain invariants
- Integration tests (invite flow, locking, timers, resolution, authorization)
- Contract tests for DTO compatibility
- E2E for full GM→player lifecycle

High-risk cases include simultaneous attacks, race conditions during auto-lock, duplicate job execution, and visibility leaks.

---

## 19. MVP Scope Recommendation

### Include

- auth + invite-only campaigns
- campaign roles
- one scenario/template
- territory ownership + map projections
- platoons + movement orders
- locking + timed expiry
- GM resolution + battle record entry
- turn summaries + notifications
- audit basics

### Exclude (v1)

- rich diplomacy simulation
- chat
- auto-GM AI
- unstable doctrine complexity
- monetization/public discovery

---

## 20. Incremental Delivery Plan

1. **Phase 0**: foundation (bootstrapping, migrations, auth skeleton)
2. **Phase 1**: campaign create + invites + lobby
3. **Phase 2**: map/state read models (GM vs player)
4. **Phase 3**: platoons + orders
5. **Phase 4**: timers + notifications
6. **Phase 5**: resolution + battles
7. **Phase 6**: visibility + audit hardening
8. **Phase 7**: playtest polish

---

## 21. Initial Backlog (Codex)

- **Epic A**: Foundation
- **Epic B**: Campaign + invites
- **Epic C**: World state
- **Epic D**: Forces + orders
- **Epic E**: Timers + notifications
- **Epic F**: Resolution
- **Epic G**: Visibility + audit

---

## 22. Codex Handover Brief (Condensed)

Implement invite-only online alpha with:

- backend-authoritative state
- strict hidden-data isolation
- immutable locked orders (unless GM unlock)
- auditable/re-runnable timers and phase transitions
- shared rules/domain layer to prevent tabletop/online drift

Delivery priority:

1. Foundation/schema
2. Auth/invites
3. Campaign/lobby
4. Map projections
5. Orders
6. Timers
7. Resolution/battles
8. Visibility/audit
9. GM recovery tools

Required outputs:

- migrations
- entities/models/repositories
- services/controllers/DTOs
- validation
- integration tests
- seed data
- minimal frontend routes/screens to exercise flow

---

## 23. Final Recommendation

Treat this as an evolution of the same campaign system from manual spreadsheet orchestration to secure server-backed async orchestration.

The right first-alpha priorities are:

- authoritative backend
- secure visibility projections
- reliable orders pipeline
- timer orchestration
- robust GM moderation tooling
