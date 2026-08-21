# Polymorph Project State

## Project identity

Polymorph is evolving from a deterministic cybersecurity training simulator into a **deterministic cyber-operations digital twin and enterprise cyber-readiness platform**.

The foundation remains one shared synthetic enterprise world with typed append-only events, deterministic replay, validated declarative scenarios, and multiple security-tool projections over the same history. Post-v1 work now prioritizes substantially deeper investigation, interactive systems, enterprise incident handling, team readiness, and customer-specific digital twins.

Polymorph remains for synthetic, isolated security simulation. It must not become a credential-harvesting product, uncontrolled arbitrary code-execution service, or system for attacking external targets.

## Current milestone

**Enterprise Evolution Phase 2: Synthetic Infrastructure Fabric and Range.**

The core Phase 1 professional-tool reset is now implemented enough to move forward. SIEM, EDR, Identity, and Case are distinct investigation applications over the same deterministic run rather than shallow panels over curated telemetry.

The next product gap is no longer primarily UI depth. Analysts need systems they can actually enter and inspect. The active milestone is therefore Stage 2A of the Synthetic Infrastructure Fabric: deterministic synthetic hosts attached to Fabric assets, exposed through a controlled investigation command surface, with every host mutation and observation remaining replayable and coherent with the shared event history.

Residual Phase 1 work such as professional-mode objective/score presentation and further response-workflow polish remains valid, but it should not block the Range foundation.

The current north star and competitive requirements are documented in:

- `COMPETITIVE_RESEARCH.md`
- `ENTERPRISE_VISION.md`
- `ROADMAP.md`

## Direct tester feedback driving the reset

Recurring feedback from first-time users:

- the current investigations feel juvenile and surface-level;
- response selection resembles an entry-level multiple-choice course more than incident response;
- technical depth is too low and the interface feels simplistic;
- SIEM/EDR/identity/case sections do not feel sufficiently differentiated;
- Case feels optional rather than necessary to operate the investigation;
- the product does not yet have a strong identity or sense of scale;
- testers want the ability to enter isolated synthetic/virtualized enterprise systems, acquire evidence, and perform red/blue incident work directly.

These are now product requirements, not polish suggestions.

## Product north star

A mature Polymorph run should feel like operating a living enterprise during an incident:

- investigate an ambiguous alert among normal/noisy activity;
- query a real-feeling SIEM rather than scroll a curated event list;
- pivot into distinct EDR, Identity, Network, Email, Cloud, Threat Intel, and other tools;
- inspect deep entity history and relationships;
- enter isolated investigation-critical systems through a safe Range layer;
- inspect processes, files, configuration, logs, services, connections, and artifacts;
- build and manage a connected incident case with evidence, hypotheses, tasks, owners, actions, and decisions;
- contain, eradicate, recover, validate, and document the incident;
- replay or branch the run later to understand alternative outcomes;
- support teams, instructors/managers, red/purple exercises, and eventually AI-agent validation over the same deterministic enterprise.

## Existing foundation

### Deterministic runtime

- pnpm workspace/monorepo
- canonical normalized `WorldState`
- deterministic virtual clock and seeded pseudo-random generator
- typed authentication, identity, session, process, file, network, endpoint, and alert events
- append-only event store
- deterministic reducers, replay, snapshots, and snapshot-assisted replay
- semantic world/event/reference validation
- deterministic serialization/deserialization
- synchronous event bus
- pure replayable projection contract
- identity projection
- EDR projection
- SIEM projection
- cross-projection coherence tests over shared event IDs/entity IDs

### Declarative scenario runtime

- versioned Zod-backed JSON scenario contract
- semantic scenario compiler
- author-friendly world seeds compiled into canonical world state
- ordered opening event history
- ordered deterministic response actions
- investigation focus metadata
- declarative account/session objectives
- deterministic active/finalized outcome evaluation
- deterministic scoring and response-quality penalties
- optional ground-truth incident metadata
- semantic validation of response actions, objectives, and ground-truth references

### Professional investigation surface

- alert-first investigation entry point and correlated timeline
- SIEM workspace with deterministic search/query, facets, time controls, raw event detail, saved searches, and exact pivots
- EDR workspace with endpoint inventory, process trees, file/network context, endpoint history, Case/SIEM pivots, and endpoint-scoped response operations
- Identity workspace with account inventory, provider/status, roles, authentication provenance, sessions, access history, Case/SIEM pivots, and identity-scoped containment
- Case incident-command workspace with evidence provenance, deterministic indicators/entities, hypotheses, tasks/owners/status, incident phase, findings, response-decision history, source-tool pivots, and generated incident reporting
- evidence collection by shared event ID across tools
- explicit finalization, deterministic outcome/score, and finalized read-only investigation state
- instructor ground-truth review
- three JSON-authored scenarios
- scenario selector and visual themes
- deterministic and Playwright browser-regression coverage
- GitHub Pages/public testing workflow

## Phase 1 implementation checkpoint

Implemented:

1. professional SIEM investigation rather than a curated event list;
2. professional EDR endpoint/process investigation;
3. deep Identity account/session/authentication investigation;
4. Case as an operational incident-command layer instead of an evidence notebook;
5. response operations available in EDR and Identity context;
6. exact cross-tool event pivots and shared Case provenance;
7. deterministic runtime/browser coverage for the new workflows.

Remaining follow-up:

- hide explicit objectives/scores during active professional-mode runs by default while retaining an optional guided mode;
- continue moving any remaining answer-card-like response work into operational context;
- increase default-scenario investigation depth as new Fabric/telemetry capabilities arrive.

## Immediate implementation priorities

1. Define a deterministic synthetic-host state model attached to Fabric devices/assets: filesystem, processes, services, users/groups, configuration, local logs, listeners, and connections.
2. Add a controlled host investigation command API that can inspect and mutate only validated synthetic host state; no arbitrary host-shell execution.
3. Record host observations/actions into deterministic run history so SIEM, EDR, Case, and future projections can explain the same causal system changes.
4. Add host snapshots/reset and prove identical replay from the same initial state plus analyst command sequence.
5. Build the first Range workspace/terminal-like client over that command API and support evidence acquisition into Case.
6. Integrate one existing scenario end-to-end so an analyst can pivot from an alert into a synthetic host, inspect artifacts/processes/configuration, collect evidence, take containment action, and see coherent telemetry updates.
7. Only after Stage 2A proves the abstraction, introduce ephemeral container-backed assets for scenarios that genuinely need real Linux/service behavior.

## Enterprise requirements are now first-class

The product is intended to become marketable/sellable to organizations. Future architecture must account for:

- durable server-backed runs;
- organizations/tenants;
- teams, users, cohorts, and roles;
- SSO/SAML/OIDC and SCIM;
- server-enforced authorization;
- auditability and retention;
- assignments/campaigns and collaboration;
- readiness baselines and skill-gap analytics;
- ATT&CK/NICE mapping;
- incident-process metrics and reporting;
- APIs/webhooks/integrations;
- managed/private/on-prem deployment options when justified;
- capacity/cost controls for interactive range infrastructure.

## Architecture policy change after v1 feedback

Earlier project guidance intentionally deferred heavy infrastructure until a demonstrated requirement existed. That requirement now exists for interactive enterprise systems and durable multi-user operation.

Therefore:

- deterministic synthetic-host infrastructure is the immediate next fidelity layer;
- container-backed and eventually VM-backed range infrastructure is explicitly in scope;
- a server runtime and database are explicitly in scope;
- orchestration, queues, caches, search engines, and service decomposition may be introduced when measured scale/reliability requirements justify them;
- Kubernetes, Redis, Kafka, OpenSearch, etc. are still implementation choices rather than status symbols and should not be added prematurely.

## Product identity

Working product layers are documented in `ENTERPRISE_VISION.md`:

- **Polymorph Fabric** - shared enterprise digital twin
- **Polymorph Ops** - distinct professional security applications
- **Polymorph Range** - interactive isolated systems
- **Polymorph Case** - investigation/incident command graph
- **Polymorph Replay** - rewind/branch/compare time machine
- **Polymorph Forge** - scenario/digital-twin authoring
- **Polymorph Control** - enterprise management/readiness plane

These names are working architecture/product concepts, not locked branding.

## Technology currently in use

- React
- TypeScript
- Vite
- pnpm workspaces
- Zod
- Vitest
- Playwright
- GitHub Actions
- GitHub Pages
- Oxlint

Expected future technologies will be selected per the enterprise roadmap, with server/runtime and isolated execution infrastructure now justified.

## Continuity rule

At the beginning of future development sessions, read:

1. `PROJECT_STATE.md`
2. `ENTERPRISE_VISION.md`
3. `COMPETITIVE_RESEARCH.md`
4. `ROADMAP.md`
5. `ARCHITECTURE.md`
6. the latest open issues/PRs and tester feedback

Future feature proposals should be evaluated against one question:

> **Does this make Polymorph feel more like a living, technically deep enterprise cyber-operations environment and less like a quiz or course?**
