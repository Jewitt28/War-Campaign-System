# WAR! Online Campaign Alpha — Technical Blueprint

## ⚠️ Source of Truth

This document is the canonical architecture for the **WAR! Online Campaign** system.

All implementation across backend, frontend, database, services, projections, and background jobs **must align with this document unless it is explicitly revised**.

If implementation and this document conflict, **this document takes precedence** until a deliberate architectural change is made and recorded here.

This file should not be deleted, renamed, or casually rewritten by implementation tasks.

---

## 1. Purpose

This blueprint defines the technical architecture for an invite-only online version of **WAR!**, built from the existing tabletop campaign system.

The online version must support two long-term delivery modes built on a shared campaign domain:

1. **Hybrid tabletop mode**
   The app manages the strategic campaign layer while battles are fought in Bolt Action or a similar tabletop ruleset.

2. **Standalone online mode**
   The app manages the strategic layer digitally and can later evolve toward more automated resolution.

The immediate goal is **not** full automation. The immediate goal is a **small closed alpha** where a GM can invite a handful of players into an asynchronous campaign, run timed phases, collect hidden orders, resolve outcomes, and publish player-safe state updates.

---

## 2. Product Strategy

### 2.1 One domain, two delivery modes

Do **not** create two disconnected products.

Create:

* one **shared domain/rules core**
* one **tabletop/hybrid presentation/orchestration mode**
* one **online persistent mode**

This avoids rules drift and preserves the current design investment.

### 2.2 Product positioning

Recommended split:

* **WAR! Tabletop Campaign** = current React-first campaign companion
* **WAR! Online Campaign Alpha** = invite-only async backend-authoritative campaign platform

### 2.3 First online release philosophy

The first online release should be:

* invite-only
* backend-authoritative
* GM-moderated
* audit-friendly
* intentionally narrow in scope

It should **not** attempt to replace the GM completely.

---

## 3. Current State Assessment

### 3.1 What already exists conceptually

The current rules, spreadsheets, and app direction already model the correct strategic building blocks:

* campaigns
* turns and phases
* territories
* factions and nations
* platoons / persistent force elements
* resources and supply
* contested territories
* hidden information / fog of war
* player packets vs GM-only state
* turn logs
* research / doctrine / strategic modifiers

That means the project already has the correct **domain shape** for online play.

### 3.2 What the spreadsheet effectively is

The spreadsheet-based tracker is functionally acting as:

* a manual write model for GM state
* a manual rules engine
* a filtered read model for player-facing data

The online version should formalize this into explicit backend architecture.

### 3.3 Main gap between current app and online alpha

The current app/store model is oriented around local rendering and flexible GM use. The online version requires:

* authenticated users
* campaign memberships
* invite-only access
* authoritative server state
* auditable order submission
* timer-based phase progression
* role-safe and faction-safe projections
* notification workflows
* recovery/admin tooling
* durable history

---

## 4. Architecture Principles

### 4.1 Backend-authoritative state

The backend is the source of truth for:

* campaign phase state
* order legality
* campaign memberships and roles
* visibility and fog of war
* territory ownership changes
* supply state
* conflict generation
* battle records
* turn advancement
* notifications and audit logs

The frontend may stage drafts for UX, but must never decide authoritative outcomes.

### 4.2 Visibility is a domain concern, not a UI concern

Fog of war is not just hidden UI.

The backend must decide what a player is allowed to know.

Never send GM-only or hidden data to the client and rely on client-side filtering.

### 4.3 Separate write model and read model

Use a pragmatic CQRS-lite approach:

* normalized relational tables for write/state integrity
* explicit DTO projections for GM, player, and observer reads

### 4.4 Preserve history

Critical campaign systems must be reconstructable.

Do not rely on overwrite-only state for:

* territory control
* platoon location/condition
* visibility state
* resource state
* phase transitions
* invite acceptance
* order locking
* conflict generation

### 4.5 GM moderation is a feature

For alpha, the system should support:

* automatic validation
* automatic locking
* structured resolution support
* optional GM override

The first version should not be forced into complete auto-resolution.

### 4.6 Security boundaries are load-bearing

Every API must be evaluated against:

* who the user is
* what campaign(s) they belong to
* what role they hold
* which faction/nation they are scoped to
* what data is public, faction-private, or GM-only

---

## 5. Recommended Technical Stack

### 5.1 Backend

* Java 21+
* Spring Boot
* Spring Web
* Spring Security
* Spring Data JPA
* Flyway
* Bean Validation
* PostgreSQL

### 5.2 Frontend

* React
* TypeScript
* Vite
* Zustand
* TanStack Query
* React Router
* component layer such as shadcn/ui or equivalent

### 5.3 Infrastructure

* PostgreSQL database
* Docker / Docker Compose for local dev
* one backend service initially
* one frontend deploy initially
* email provider for invites and notifications
* optional Redis later if job volume or caching needs increase

### 5.4 Realtime and updates

* SSE first
* WebSocket only if later justified

SSE is sufficient for alpha needs such as:

* phase updates
* notifications
* turn resolution completion
* GM announcements

---

## 6. Versioning Strategy

Maintain explicit versions for three different concerns:

### 6.1 `ruleset_version`

Controls gameplay logic compatibility and campaign rule interpretation.

### 6.2 `schema_version`

Controlled by Flyway migrations and DB history.

### 6.3 `api_version`

Controls frontend/backend contract expectations where breaking changes occur.

All breaking changes should be versioned deliberately.

---

## 7. Bounded Contexts / Modules

Recommended logical backend areas:

1. Identity & Access
2. Campaign Management
3. Membership & Invites
4. World Map / Territories
5. Forces / Platoons
6. Visibility / Fog of War
7. Orders
8. Resolution / Battles
9. Resources / Supply / Reputation
10. Research / Doctrine / Upgrades
11. Notifications
12. Audit / Event Log
13. GM / Admin Tools

---

## 8. Domain Model

### 8.1 User

Represents a real authenticated person.

Fields:

* id (UUID)
* email
* displayName
* authProvider
* status
* createdAt
* updatedAt

### 8.2 Campaign

Represents a playable campaign instance.

Fields:

* id
* name
* slug
* description
* mode (`TABLETOP`, `ONLINE`)
* rulesetVersion
* campaignStatus (`DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`)
* currentTurnNumber
* currentPhase (`LOBBY`, `STRATEGIC`, `OPERATIONS`, `RESOLUTION`, `INTERTURN`)
* phaseStartedAt
* phaseEndsAt
* createdByUserId
* gmControlsEnabled
* fogOfWarEnabled
* timersEnabled
* createdAt
* updatedAt

### 8.3 CampaignSettings

Optional separate settings aggregate if needed for expansion.

Fields:

* id
* campaignId
* battleMode (`TABLETOP`, `HYBRID`, `AUTO`)
* operationsPhaseDurationMinutes
* strategicPhaseDurationMinutes
* resolutionPhaseDurationMinutes nullable
* allowGmOverride
* enableResearch
* enableNpcActors
* enableReputation
* enableDynamicEvents
* createdAt
* updatedAt

### 8.4 CampaignMember

Maps a user into a campaign.

Fields:

* id
* campaignId
* userId
* role (`GM`, `PLAYER`, `OBSERVER`)
* factionId nullable
* nationId nullable
* status (`PENDING`, `ACTIVE`, `REMOVED`)
* joinedAt

### 8.5 CampaignInvite

Invite-only access control.

Fields:

* id
* campaignId
* email
* tokenHash
* intendedRole
* intendedFactionId nullable
* intendedNationId nullable
* status (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`)
* expiresAt
* createdByUserId
* acceptedAt nullable
* revokedAt nullable
* createdAt

### 8.6 Faction

Top-level strategic side.

Fields:

* id
* campaignId
* key
* name
* type (`MAJOR`, `MINOR`, `NPC`, `NEUTRAL`, `NON_STATE`)
* color
* isPlayerControlled
* leaderMemberId nullable
* createdAt

### 8.7 Nation

Sub-identity within a faction where relevant.

Fields:

* id
* campaignId
* factionId nullable
* key
* name
* doctrineProfileKey nullable
* isNpc
* metadataJson

### 8.8 Theatre

Map partition.

Fields:

* id
* campaignId
* key
* name
* displayOrder
* active

### 8.9 Territory

Static geography and baseline strategic data.

Fields:

* id
* campaignId
* theatreId
* territoryCode
* name
* terrainType
* strategicTagsJson
* baseIndustry
* baseManpower
* hasPort
* hasAirfield
* maxFortLevel
* shapeRefsJson
* metadataJson

### 8.10 TerritoryAdjacency

Movement edge definition.

Fields:

* id
* campaignId
* fromTerritoryId
* toTerritoryId
* edgeType (`LAND`, `SEA`, `AIR`, `SPECIAL`)
* movementCost
* conditionsJson

### 8.11 TerritoryState

Turn-based territory snapshot.

Fields:

* id
* campaignId
* territoryId
* turnNumber
* ownerFactionId nullable
* controllerNationId nullable
* strategicStatus (`CONTROLLED`, `CONTESTED`, `NEUTRAL`, `OCCUPIED`, `DEVASTATED`)
* fortLevel
* partisanRisk
* supplyStatus
* damageJson
* notes
* createdAt

### 8.12 Platoon

Persistent force element.

Fields:

* id
* campaignId
* factionId
* nationId nullable
* assignedMemberId nullable
* unitName
* unitType
* osv nullable
* veterancy nullable
* hiddenFromPlayers
* createdAt

### 8.13 PlatoonState

Turn/phase snapshot of platoon condition.

Fields:

* id
* campaignId
* platoonId
* turnNumber
* phase
* territoryId
* conditionBand (`FRESH`, `WORN`, `DEPLETED`, `SHATTERED`, `DESTROYED`)
* supplyBand (`SUPPLIED`, `STRAINED`, `UNSUPPLIED`, `ISOLATED`)
* manpowerStrength nullable
* readiness nullable
* concealed
* notes
* createdAt

### 8.14 ResourceState

Faction strategic economy snapshot.

Fields:

* id
* campaignId
* factionId
* turnNumber
* industryPoints
* manpowerPoints
* fuelPoints
* intelPoints
* momentumPoints
* logisticsPoints nullable
* createdAt

### 8.15 ReputationState

Stores hidden GM-facing numeric value plus public projection.

Fields:

* id
* campaignId
* factionId
* turnNumber
* hiddenScore
* publicBand
* lastChangedReason
* createdAt

### 8.16 WarState

Relationship between factions.

Fields:

* id
* campaignId
* factionAId
* factionBId
* state (`PEACE`, `TENSION`, `LIMITED_WAR`, `FULL_WAR`)
* effectiveTurn
* sourceType
* sourceRef nullable
* createdAt

### 8.17 VisibilityState

Per-viewer visibility of a territory.

Fields:

* id
* campaignId
* territoryId
* viewerFactionId
* turnNumber
* visibilityLevel (`UNKNOWN`, `RUMOURED`, `SCOUTED`, `OBSERVED`, `OWNED`, `FULL`)
* visibleOwner
* visibleFortLevel
* visibleForcesSummary
* sourceType
* confidenceScore nullable
* decayTurn nullable
* updatedAt

### 8.18 Turn

Represents one campaign turn lifecycle.

Fields:

* id
* campaignId
* turnNumber
* status (`OPEN`, `LOCKED`, `RESOLVING`, `COMPLETE`)
* strategicStartedAt
* strategicEndedAt
* operationsStartedAt
* operationsEndedAt
* resolutionStartedAt
* resolutionEndedAt
* completedAt

### 8.19 OrderSubmission

Container for a player or faction submission.

Fields:

* id
* campaignId
* turnNumber
* submittedByMemberId
* factionId
* status (`DRAFT`, `LOCKED`, `REVEALED`, `RESOLVED`, `VOID`)
* submittedAt nullable
* lockedAt nullable
* revealAt nullable
* checksum nullable

### 8.20 PlatoonOrder

Atomic order line.

Fields:

* id
* orderSubmissionId
* platoonId
* orderType (`MOVE`, `ATTACK`, `WITHDRAW`, `HOLD`, `RECON`, `BOMBARD`, `REFIT`, `REDEPLOY`, `SUPPORT`, `DIPLOMACY_ATTACH`)
* sourceTerritoryId nullable
* targetTerritoryId nullable
* payloadJson
* validationStatus
* validationErrorsJson
* createdAt

### 8.21 Battle

Conflict created from orders or scripted events.

Fields:

* id
* campaignId
* turnNumber
* territoryId
* battleStatus (`PENDING`, `SCHEDULED`, `RESOLVED`, `CANCELLED`)
* attackerFactionId
* defenderFactionId
* battleMode (`TABLETOP`, `HYBRID`, `AUTO`)
* scenarioKey nullable
* scheduledFor nullable
* tabletopResultSummary nullable
* strategicResultJson nullable
* createdAt

### 8.22 BattleParticipant

Participant rows for generated battles.

Fields:

* id
* battleId
* platoonId
* side
* preConditionBand nullable
* postConditionBand nullable

### 8.23 ResolutionEvent

Immutable event from engine or GM.

Fields:

* id
* campaignId
* turnNumber
* phase
* eventType
* visibilityScope (`GM_ONLY`, `FACTION_ONLY`, `PUBLIC`)
* viewerFactionId nullable
* territoryId nullable
* actorFactionId nullable
* targetFactionId nullable
* payloadJson
* createdByType (`SYSTEM`, `GM`)
* createdByMemberId nullable
* createdAt

### 8.24 Notification

In-app notification.

Fields:

* id
* campaignId nullable
* recipientUserId
* type
* title
* body
* payloadJson
* readAt nullable
* createdAt

### 8.25 CampaignAuditLog

High-value audit trail.

Fields:

* id
* campaignId
* actorType (`SYSTEM`, `USER`)
* actorUserId nullable
* actorMemberId nullable
* actionType
* entityType
* entityId
* beforeJson nullable
* afterJson nullable
* createdAt

---

## 9. Data Modeling Guidance

### 9.1 UUIDs

Use UUIDs for all major primary keys exposed through the app and APIs.

### 9.2 Static map data vs mutable campaign state

Separate baseline map definition concerns from turn-by-turn mutable campaign state.

For alpha, it is acceptable to seed campaign-specific copies of map data if that accelerates delivery.

### 9.3 Snapshot plus history strategy

For critical mutable entities, maintain:

* current snapshot records for efficient reads
* append-only history/event records for traceability

### 9.4 JSONB use

Use JSONB only where flexibility is beneficial, such as:

* order payloads
* validation details
* battle results
* modifier sets
* audit diffs

Do not hide core relational structure in JSONB.

---

## 10. Database Schema Requirements

### 10.1 Table groups

Recommended schema groupings:

#### identity_access

* users
* campaign_invites
* campaign_members

#### campaign_core

* campaigns
* campaign_settings
* turns
* campaign_audit_logs

#### world

* factions
* nations
* theatres
* territories
* territory_adjacencies
* territory_states

#### forces

* platoons
* platoon_states

#### strategic

* resource_states
* reputation_states
* war_states
* research_projects
* research_progress
* doctrine_states
* upgrade_instances

#### visibility

* visibility_states
* visibility_events

#### orders

* order_submissions
* platoon_orders

#### resolution

* battles
* battle_participants
* resolution_events

#### messaging

* notifications
* outbound_emails

### 10.2 Non-negotiable relational constraints

At minimum enforce:

* unique campaign membership per `(campaign_id, user_id)`
* unique faction key per campaign
* unique territory code per campaign
* unique turn per `(campaign_id, turn_number)`
* unique territory state per `(territory_id, turn_number)`
* unique visibility row per `(territory_id, viewer_faction_id, turn_number)`

### 10.3 Enum safety

Use DB check constraints or strongly controlled enum values for:

* campaign phases
* campaign statuses
* member roles
* invite statuses
* territory status
* turn status
* order status
* battle status

### 10.4 Flyway ownership

Schema changes must be introduced through Flyway migrations, not ad hoc runtime schema generation.

---

## 11. Read Models / Projection Strategy

Controllers must not expose raw JPA entities.

Define projection DTOs for role-safe consumption.

### 11.1 GM campaign overview DTO

Should include:

* campaign metadata
* current phase and timer state
* faction summaries
* pending submissions
* contested territories
* pending battles
* notifications
* unresolved events

### 11.2 Player campaign overview DTO

Should include:

* campaign metadata
* current phase and timer state
* own faction summary
* public war states
* visible territories
* visible force summaries
* own order submission state
* visible alerts

### 11.3 Territory projection DTOs

Use separate DTOs for:

* GM territory detail
* player-safe territory detail

### 11.4 Platoon projection DTOs

Use separate DTOs for:

* GM platoon detail
* player-controlled platoon detail
* public or visible enemy summary if later needed

---

## 12. Rules Engine Design

### 12.1 Shared domain/rules module

Create a shared domain package or module responsible for campaign rule logic.

Suggested responsibilities:

* phase transitions
* order validation
* movement legality
* resource collection
* visibility recalculation
* conflict generation
* battle result application
* reputation/public-band projection
* research progression

### 12.2 Design goals

Rules should be:

* deterministic
* testable
* explicit
* configuration-aware where appropriate

### 12.3 Service interface examples

Potential interfaces:

* `PhaseService`
* `OrderValidationService`
* `MovementService`
* `VisibilityService`
* `ResourceService`
* `BattleGenerationService`
* `ResolutionService`

### 12.4 Domain invariants

Examples:

* players can only submit orders for platoons they control
* locked submissions are immutable unless explicitly unlocked by GM workflow
* campaign state cannot skip illegal phase transitions
* player endpoints never return GM-only fields
* resource snapshots must reconcile with prior state plus events
* visibility must be computed from legal sources

---

## 13. Auth, Access, and Invite Model

### 13.1 Roles

Campaign-level roles for alpha:

* `GM`
* `PLAYER`
* `OBSERVER`

### 13.2 Invite-only user flow

1. GM creates campaign.
2. GM issues invites by email.
3. Invitee signs in or is provisioned in dev flow.
4. Invite token is validated.
5. Membership is created or activated.
6. Campaign lobby becomes accessible.

### 13.3 Authorization rules

#### GM

Can:

* read all campaign state
* manage members
* advance/reopen phases
* resolve battles and outcomes
* access audit/admin tools

#### Player

Can:

* read only their visible campaign state
* read own faction/nation scoped information
* create, edit, and lock own orders where allowed
* see public and faction-private logs as appropriate

#### Observer

Can:

* read only explicitly permitted public state
* not submit orders

### 13.4 Dev auth guidance

A temporary dev header-based auth flow is acceptable for alpha development but must be hard-gated by environment/profile and must never be assumed safe for production.

---

## 14. Campaign Lifecycle

### 14.1 Campaign creation

1. GM creates campaign from a template or seeded scenario.
2. Campaign data is initialized.
3. GM invites players.
4. Campaign remains in lobby.
5. GM starts turn 1.

### 14.2 Phase model

Recommended online phases:

* `LOBBY`
* `STRATEGIC`
* `OPERATIONS`
* `RESOLUTION`
* `INTERTURN`

### 14.3 Phase meanings

#### Strategic

* resource updates
* reinforcement/refit choices
* research progression
* diplomacy inputs

#### Operations

* hidden simultaneous orders
* save draft
* validate
* lock
* countdown timer

#### Resolution

* reveal submissions
* determine conflicts
* create battles and/or consequences
* GM review and apply results

#### Interturn

* cleanup
* publish summaries
* recalculate persistent state
* advance to next turn

---

## 15. Orders System

### 15.1 Order workflow

Recommended order lifecycle:

* player drafts order set
* server validates drafts
* player locks submission
* timer expiry auto-locks if configured
* locked submission becomes immutable
* submission enters reveal/resolution workflow

### 15.2 Order states

* `DRAFT`
* `VALIDATED`
* `LOCKED`
* `REVEALED`
* `RESOLVED`
* `VOID`

### 15.3 Validation layers

#### Client-side

Fast UX only.

#### Server-side

Source of truth.
Must include checks such as:

* user controls the platoon
* correct campaign and turn
* correct phase
* target exists
* target/faction legality
* movement legality later

### 15.4 Locking rules

Once a submission is locked:

* player cannot edit it
* lock timestamp is stored
* checksum may be stored for audit
* any later unlock must be explicit GM action and audited

---

## 16. Fog of War / Visibility

### 16.1 Visibility levels

Suggested normalized values:

* `UNKNOWN`
* `RUMOURED`
* `SCOUTED`
* `OBSERVED`
* `OWNED`
* `FULL`

### 16.2 What visibility controls

Depending on level, a viewer may or may not see:

* territory name or just existence
* ownership
* fortification level
* resource value
* friendly force presence
* enemy force summary
* exact enemy identity
* contested state
* event history

### 16.3 Visibility update triggers

Potential triggers include:

* recon actions
* combat
* friendly occupation
* intel spending
* research unlocks
* world events
* GM interventions
* turn advancement

### 16.4 Hard requirement

Player-facing endpoints must only return the fields allowed by backend visibility rules.

---

## 17. Resolution and Battle Pipeline

### 17.1 Resolution stages

1. Lock all relevant submissions.
2. Reveal locked submissions.
3. Resolve movement and order interactions.
4. Determine contested territories.
5. Generate battles where needed.
6. Apply strategic outcomes where allowed.
7. Recalculate supply and visibility.
8. Publish summary events.

### 17.2 Battle modes

#### TABLETOP

System creates conflict and awaits externally fought battle result entry.

#### HYBRID

GM records battle outcome and system applies strategic consequences.

#### AUTO

System determines strategic result directly.

### 17.3 Battle result input

Result capture should support fields such as:

* winner
* result tier
* attacker losses
* defender losses
* retreats
* collateral damage
* escalation flags
* notes

### 17.4 Resolution output

Resolution must produce:

* updated territory states
* updated platoon states
* battle records
* resource/reputation changes where appropriate
* notifications
* audit entries
* visible player-safe summaries

---

## 18. Resources, Supply, Reputation, Diplomacy

### 18.1 Resource model

Track resource snapshots per faction and turn.

Potential tracked values:

* industry
* manpower
* fuel
* intel
* momentum
* logistics

### 18.2 Supply model

Expose supply in safe bands such as:

* `SUPPLIED`
* `STRAINED`
* `UNSUPPLIED`
* `ISOLATED`

### 18.3 Reputation model

Maintain dual representation:

* hidden internal numeric score for system/GM use
* public band or public mood projection for player-facing reads

Never expose the hidden score directly.

### 18.4 Diplomacy for alpha

Keep diplomacy narrow in the first online version.
Prefer event-driven or light-weight strategic choices over a full NPC simulation unless already stable.

---

## 19. Research / Doctrine / Upgrades

### 19.1 Alpha recommendation

Only include deeper research/doctrine systems in the first online playtest if the current design is already stable enough.

### 19.2 Minimal viable version

If included in alpha, prefer:

* one active project at a time
* cost + duration
* one unlock or modifier result

### 19.3 Rule placement

All effect application should live in the domain/rules layer, not in controllers.

---

## 20. Notifications and Messaging

### 20.1 Required notification types

At minimum support:

* invite sent
* invite accepted
* phase started
* phase ending soon
* orders auto-locked
* resolution completed
* new battle created
* GM announcement

### 20.2 Delivery channels

For alpha:

* in-app notifications
* email notifications

Skip in-app chat initially.

---

## 21. API Design

### 21.1 Style

REST is sufficient for alpha.

### 21.2 Endpoint groups

#### Auth

* `GET /api/auth/me`

#### Invites

* `GET /api/invites/{token}`
* `POST /api/invites/{token}/accept`

#### Campaigns

* `GET /api/campaigns`
* `GET /api/campaigns/{campaignId}`
* `POST /api/campaigns`
* `PATCH /api/campaigns/{campaignId}`

#### Membership

* `GET /api/campaigns/{campaignId}/members`
* `PATCH /api/campaigns/{campaignId}/members/{memberId}`

#### Map / Territories

* `GET /api/campaigns/{campaignId}/map`
* `GET /api/campaigns/{campaignId}/territories/{territoryId}`
* `GET /api/campaigns/{campaignId}/territories/{territoryId}/gm`

#### Platoons

* `GET /api/campaigns/{campaignId}/platoons`
* `GET /api/campaigns/{campaignId}/platoons/{platoonId}`

#### Orders

* `GET /api/campaigns/{campaignId}/turns/{turnNumber}/orders/me`
* `PUT /api/campaigns/{campaignId}/turns/{turnNumber}/orders/me`
* `POST /api/campaigns/{campaignId}/turns/{turnNumber}/orders/me/lock`

#### Phase / Resolution / Battles

* `GET /api/campaigns/{campaignId}/phase`
* `POST /api/campaigns/{campaignId}/phase/advance`
* `GET /api/campaigns/{campaignId}/turns/{turnNumber}/resolution`
* `POST /api/campaigns/{campaignId}/turns/{turnNumber}/resolve`
* `GET /api/campaigns/{campaignId}/battles/{battleId}`
* `POST /api/campaigns/{campaignId}/battles/{battleId}/result`

#### Notifications

* `GET /api/me/notifications`
* `POST /api/me/notifications/{id}/read`

#### GM / Admin

* `POST /api/campaigns/{campaignId}/phase/reopen`
* `POST /api/campaigns/{campaignId}/visibility/rebuild`
* `POST /api/campaigns/{campaignId}/snapshots/export`

### 21.3 Error envelope

All API errors should use a consistent structured response with:

* stable error code
* human-readable message
* optional details
* timestamp
* path where appropriate

---

## 22. Frontend Information Architecture

### 22.1 Public/Auth

* landing page
* sign in / invite entry
* invite acceptance

### 22.2 Campaign Lobby

* campaign overview
* invited/active members
* faction assignments
* readiness state

### 22.3 Player App

* dashboard
* campaign map
* faction summary
* platoon list
* orders console
* battle list
* event log
* notifications

### 22.4 GM App

* GM dashboard
* full map view
* member management
* faction summary monitor
* orders review
* resolution console
* battles console
* audit log
* admin tools

---

## 23. Backend Module Structure

Recommended package layout:

```text
com.warcampaign.backend
  api
  auth
  config
  controller
  dto
  exception
  security
  domain
    enums
    model
    rules
    service
  repository
  service
  projection
  mapper
  jobs
  audit
  notification
  common
```

Controllers should remain thin. Workflow logic belongs in services/domain services. Read-model assembly belongs in projection/mapper layers.

---

## 24. Background Jobs and Timers

### 24.1 Required scheduled processes

#### Phase expiry watcher

* detect campaigns whose phase has expired
* auto-lock eligible submissions
* advance or mark ready for resolution

#### Notification scheduler

* send phase reminders
* send invite reminders

#### Visibility rebuild job

* rebuild visibility projections when triggered

#### Snapshot/export job

* create recovery or reviewable campaign export artifacts

### 24.2 Job safety

All jobs must be idempotent.
Running them twice must not corrupt state.

---

## 25. Observability and Recovery

### 25.1 Structured logging

Log important events such as:

* auth events
* invite acceptance
* membership updates
* order lock events
* phase changes
* resolution runs
* battle result submissions
* GM overrides

### 25.2 Metrics

Track at minimum:

* active campaigns
* active users
* invite acceptance rate
* average submission lock time
* auto-lock count
* failed jobs
* failed notifications

### 25.3 Recovery tools

GM/admin tools should support:

* force phase advance
* reopen operations
* unlock a submission deliberately
* rerun safe parts of resolution
* rebuild visibility projections
* export campaign snapshot
* inspect audit history

---

## 26. Non-Functional Requirements

### 26.1 Security

* backend authorization on every protected endpoint
* no hidden fields in player DTOs
* hashed invite tokens preferred
* audit GM overrides
* validate inputs

### 26.2 Reliability

* transactional phase changes
* transactional invite acceptance
* migration-managed schema
* idempotent jobs

### 26.3 Performance

* projection-based map reads
* appropriate indexes on campaign/faction/turn scoped reads
* avoid N+1 fetch patterns
* lazy relationships by default unless justified otherwise

### 26.4 Maintainability

* keep rules in domain services
* avoid controller business logic
* version schema deliberately
* test invariants explicitly

---

## 27. Test Strategy

### 27.1 Unit tests

Cover:

* phase transitions
* order validation
* visibility logic
* resource calculations
* battle result application

### 27.2 Integration tests

Cover:

* invite acceptance
* campaign access scoping
* membership updates
* order locking
* phase expiry
* resolution skeleton
* authorization boundaries

### 27.3 End-to-end flows

Critical alpha E2E journeys:

1. GM creates campaign and invites players.
2. Player accepts invite.
3. Player accesses campaign lobby.
4. Player views permitted campaign state.
5. Player drafts and locks orders.
6. GM advances or timer expires.
7. GM resolves turn and records outcome.
8. Players receive updated visible state.

### 27.4 High-risk cases

Explicitly test:

* cross-campaign access denial
* duplicate invite acceptance
* expired/revoked invite handling
* hidden data leakage through player endpoints
* duplicate scheduled job execution
* locked order mutation attempts

---

## 28. MVP Scope for Closed Alpha

### 28.1 Include

* auth baseline
* invite-only campaign access
* GM and player roles
* one campaign template or seeded scenario
* territories and ownership
* platoons and latest state
* faction resource summaries
* operations order drafting + locking
* phase timer or GM-driven advance
* basic battle record creation
* turn summaries
* notifications
* audit logging basics

### 28.2 Exclude for now

* full diplomacy simulation
* complex NPC automation
* rich in-app chat
* large template library
* public matchmaking
* monetization
* advanced mobile polish
* full tactical auto-resolution if not stable

---

## 29. Incremental Delivery Plan

### Phase 0 — Foundation

Deliver:

* backend bootstrap
* DB migrations
* base entities
* repositories
* configuration
* seed data

### Phase 1 — Auth & Invite Flow

Deliver:

* auth baseline
* `/api/auth/me`
* invite lookup
* invite acceptance
* API error envelope

### Phase 2 — Campaign Lobby & Membership

Deliver:

* campaign list/detail
* members API
* GM-only member updates
* lobby projections

### Phase 3 — Map / Territory Read Models

Deliver:

* GM map projection
* player-safe map projection
* territory detail endpoints

### Phase 4 — Platoon Read Models

Deliver:

* player force list
* GM platoon detail
* scoped access controls

### Phase 5 — Orders Workflow

Deliver:

* submission schema
* order DTOs
* draft/save/lock flow
* lock immutability

### Phase 6 — Phase Management

Deliver:

* phase transition service
* GM manual advance
* timer expiry handling
* audit entries

### Phase 7 — Resolution Skeleton

Deliver:

* reveal submissions
* create battles/conflicts
* resolution events
* turn summary output

### Phase 8 — Visibility Hardening & Playtest Tools

Deliver:

* visibility projections/rebuild
* audit tools
* export/recovery tools
* GM admin utilities

---

## 30. Playtest Plan

### 30.1 Closed alpha shape

Recommended first playtest:

* 1 GM
* 3–6 players
* 1 theatre only
* limited territory count
* limited platoon count
* short operations timer or GM fallback

### 30.2 Success criteria

* users join without friction
* campaign access is correctly scoped
* no visibility leaks occur
* one full turn runs end-to-end without DB surgery
* order flow is understandable
* GM resolution effort is manageable

### 30.3 Feedback focus areas

Gather feedback on:

* orders UX clarity
* map readability
* pacing of timed phases
* fairness of hidden information
* usefulness of summaries and notifications

---

## 31. Risks and Mitigations

### Risk 1 — Scope explosion

Mitigation: lock alpha to a narrow slice.

### Risk 2 — Hidden data leakage

Mitigation: projection-based APIs + integration tests.

### Risk 3 — Timer/phase race conditions

Mitigation: transactional state changes + idempotent jobs.

### Risk 4 — Rules drift between local and online modes

Mitigation: shared domain/rules core.

### Risk 5 — Over-automation too early

Mitigation: retain GM-assisted workflow for alpha.

---

## 32. Immediate Implementation Priorities

The preferred implementation sequence is:

1. Foundation schema and entities
2. Auth and invite acceptance
3. Campaign lobby and membership APIs
4. Territory/map read projections
5. Platoon read projections
6. Order submission draft/lock workflow
7. Phase and timer management
8. Resolution skeleton and battle creation
9. Visibility hardening and GM recovery tools

This sequence should be followed unless there is a strong architectural reason to deviate.

---

## 33. Codex Handover Guidance

Every implementation prompt for Codex should include these guardrails:

```text
The file /docs/war-online-campaign-alpha-technical-blueprint.md is the canonical architecture.
Do not delete, rename, or replace this file.
All implementation must align with it.
Do not expose JPA entities directly from controllers.
Use DTOs and mapping/projection layers.
Keep controllers thin.
Keep hidden and GM-only fields out of player-facing responses.
Add integration tests for authorization boundaries.
```

---

## 34. Final Recommendation

Treat the online version as the evolution of the same campaign system rather than a disconnected new idea.

The work is not to invent a new game from scratch. The work is to formalize the existing campaign model into:

* an authoritative backend
* secure access and visibility boundaries
* durable campaign state
* an auditable order workflow
* timer-driven orchestration
* GM tooling strong enough for real playtesting

That path is feasible, and this document is the implementation baseline for it.
