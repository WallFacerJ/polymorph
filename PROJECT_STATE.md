# Polymorph Project State

## Project identity

Polymorph is evolving from a deterministic cybersecurity training simulator into a **deterministic cyber-operations digital twin and enterprise cyber-readiness platform**.

The foundation remains one shared synthetic enterprise world with typed append-only events, deterministic replay, validated declarative scenarios, and multiple security-tool projections over the same history. Post-v1 work now prioritizes substantially deeper investigation, interactive systems, enterprise incident handling, team readiness, and customer-specific digital twins.

Polymorph remains for synthetic, isolated security simulation. It must not become a credential-harvesting product, uncontrolled arbitrary code-execution service, or system for attacking external targets.

## Current milestone

**Enterprise Evolution Phase 2: Synthetic Infrastructure Fabric and Range.**

The core Phase 1 professional-tool reset is implemented enough to move forward. SIEM, EDR, Identity, and Case are distinct investigation applications over the same deterministic run rather than shallow panels over curated telemetry.

Stage 2A now has a coherent cross-product loop. Deterministic synthetic-host state is attached to canonical Fabric devices and authored in scenario JSON; analysts can enter the host through Range, inspect or mutate capability-gated state, acquire immutable typed investigation artifacts from read-only host observations, and have material host actions and acquired evidence appear in the same canonical event history consumed by SIEM, EDR response history, the incident timeline, and Case. Process containment also closes process-owned synthetic network state deterministically.

Structured Range acquisition is an explicit domain boundary rather than saved terminal text. File, process, service, identity, configuration, log, network, and host-history acquisitions preserve deterministic source snapshots; file acquisitions retain authored SHA-256 values where present; provenance records the device, source invocation, acquisition method/time, source reference, related entities/indicators, and explicit integrity status. Canonical evidence events embed the acquired artifact and Case exposes its provenance. Event validation rejects inconsistent embedded provenance.

Synthetic hosts also expose an explicit relationship layer. Process ancestry, account ownership, and process-owned network objects are derived only from authoritative IDs already present in host state. Process-to-file and service/process-to-configuration relationships are declaratively authored and endpoint-validated. Range exposes relationship-aware process investigation and safe pivots, acquired artifacts retain their source neighborhood, and Case derives artifact-to-artifact lineage from shared source objects. Live containment can mutate process/network state without rewriting previously acquired historical lineage.

Range now also has an immutable time-aware host-activity layer separate from live mutable state. Scenario compilation derives only exact lifecycle facts it already owns from authoritative process/file timestamps and exact canonical network tuples, merges those facts with optional endpoint-validated authored activity, and exposes deterministic history queries with process/file/service/configuration/connection filtering. History acquisitions retain the immutable activity snapshot, source-object refs, explicit start/end bounds, relationship lineage, and network indicators. Containment can terminate a process and close its current connection without rewriting prior process/network activity, and reset reconstructs the authored/derived history deterministically. Host history is Range control-plane evidence and is intentionally not modeled as an operating-system capability on the synthetic host.

Service lifecycle now distinguishes current runtime state from persistence policy. Range can change a modeled service startup mode through the controlled `set-startup` command while leaving its running/stopped state unchanged. Material startup-policy changes emit typed canonical `HOST_SERVICE_STARTUP_MODE_CHANGED` events with previous/current values, appear in SIEM and EDR Range response history, validate as material changes, and replay/reset deterministically. Historical startup-policy facts remain immutable rather than being rewritten by live response operations.

The next Stage 2A milestone is no longer basic event plumbing, evidence capture, first-order host graphing, first-pass host history, or service startup-policy plumbing. It should broaden plausible benign host activity and competing explanations, deepen file/configuration/recovery lifecycle where that creates investigation value, expand response operations in system context, and make the Case graph easier to navigate without turning source facts into conclusions. Stage 2B should then establish a runtime-provider boundary and add one isolated container-backed asset where real operating-system/service behavior creates material investigative value.

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
- typed authentication, identity, session, process, file, network, endpoint, alert, and Range host events
- append-only event store
- deterministic reducers, replay, snapshots, and snapshot-assisted replay
- semantic world/event/reference validation
- deterministic serialization/deserialization
- synchronous event bus
- pure replayable projection contract
- identity projection
- EDR projection plus canonical Range host-response projection
- SIEM projection including Range host events
- cross-projection coherence tests over shared event IDs/entity IDs
- deterministic synthetic-host state for filesystem, processes, services, local identity, configuration, logs, listeners, and connections
- capability-gated structured host commands with immutable results and audit records
- synthetic-host replay, reset, and serialization/deserialization
- deterministic bridge from material host mutations to canonical run events
- typed Range acquisition artifacts for file, process, service, identity, configuration, log, network, and host-history evidence
- deterministic artifact-first bridge from read-only host results to canonical Case-compatible evidence events
- provenance-coherence validation for embedded Range artifacts and evidence metadata
- typed synthetic-host relationship graph combining explicit authored facts with deterministic ID-backed relationships
- relationship endpoint/duplicate validation in scenario compilation and core scenario validation
- relationship-aware process/service investigation helpers
- immutable artifact source refs and relationship snapshots used for deterministic Case artifact lineage
- immutable typed synthetic-host activity facts for process lifecycle, file activity, service state, service startup policy, configuration changes, and network connection lifecycle
- deterministic host-history ordering/filtering and exact source-object reference resolution
- immutable history artifacts with activity bounds, source refs, lineage, and network indicators
- controlled service startup-policy mutation kept separate from service runtime status
- canonical service startup-policy response events projected coherently into SIEM and EDR

### Declarative scenario runtime

- versioned Zod-backed JSON scenario contract
- semantic scenario compiler
- author-friendly world seeds compiled into canonical world state
- optional declarative synthetic hosts validated against canonical Fabric device IDs
- optional declarative synthetic-host process/file/service/configuration relationships with strict endpoint validation
- optional declarative synthetic-host activity merged with exact compiler-derived lifecycle/network facts
- authored service startup-policy history with strict endpoint and material-change validation
- strict activity ID, timestamp, and host-object endpoint validation before analyst use
- ordered opening event history
- ordered deterministic response actions
- investigation focus metadata
- declarative account/session objectives
- deterministic active/finalized outcome evaluation
- deterministic scoring and response-quality penalties
- optional ground-truth incident metadata
- semantic validation of response actions, objectives, ground-truth references, synthetic-host attachments, host relationship graphs, and host activity

### Professional investigation surface

- alert-first investigation entry point and correlated timeline
- SIEM workspace with deterministic search/query, facets, time controls, raw event detail, saved searches, exact pivots, and canonical Range host activity
- EDR workspace with endpoint inventory, process trees, file/network context, endpoint history, Case/SIEM pivots, endpoint-scoped response operations, Range pivots for authored hosts, and Range response history
- Identity workspace with account inventory, provider/status, roles, authentication provenance, sessions, access history, Case/SIEM pivots, and identity-scoped containment
- Case incident-command workspace with evidence provenance, deterministic indicators/entities, hypotheses, tasks/owners/status, incident phase, findings, response-decision history, source-tool pivots, generated incident reporting, explicit Range artifact provenance/integrity, source refs, and artifact-to-artifact lineage
- Range synthetic-host workspace with a fixed safe command vocabulary compiled into structured host commands, deterministic command/audit history, live host inspection, time-aware host-history queries, relationship-aware process context, safe staged pivots, validated process/service/file mutations, separate service runtime/startup-policy controls, professional artifact acquisition into Case, immutable acquisition state, and exact reset
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

## Phase 2A implementation checkpoint

Implemented:

1. deterministic synthetic-host state attached to canonical Fabric devices;
2. filesystem/process/service/local-identity/config/log/network host models;
3. controlled read and mutation commands with explicit capabilities and no arbitrary shell execution;
4. deterministic command audit, replay, reset, and serialization;
5. declarative scenario-authored synthetic hosts with compiler validation;
6. first coherent `FIN-LT-04` host aligned with existing EDR process/file/network telemetry;
7. EDR-to-Range pivot and terminal-like Range workspace;
8. material Range process/service/file mutations promoted into typed canonical run events;
9. immutable typed Range artifacts acquired from read-only file/process/service/identity/config/log/network observations;
10. file artifacts preserve authored SHA-256 values and deterministic content/metadata snapshots without inventing integrity data;
11. canonical Range evidence records carry artifact ID, source invocation, acquisition method/time, source reference, related entities/indicators, integrity metadata, and the structured artifact snapshot;
12. Case visibly distinguishes acquired Range artifacts and exposes provenance/integrity context;
13. canonical Range events are searchable in SIEM and visible as EDR endpoint response history;
14. process termination deterministically closes process-owned synthetic connections/listeners;
15. reset removes acquired artifacts/evidence by reconstructing authored state, and finalized runs cannot acquire new artifacts;
16. runtime and browser coverage exercises host inspection, safe-command rejection, file/network acquisition, provenance/integrity, cross-tool propagation, mutation, finalization, and reset;
17. canonical event validation rejects tampered embedded artifact provenance;
18. synthetic-host relationships combine ID-derived parent/account/network ownership with explicit authored process/file/service/configuration facts;
19. invalid relationship endpoints and duplicate relationship IDs fail scenario validation before analyst use;
20. the shipped Finance host authors Word-to-document, PowerShell-to-staged-script, BackupAgent-startup, and Telemetry-policy relationships without inventing unsupported service-process causality;
21. Range process context exposes relationship facts and stages only commands from the controlled vocabulary;
22. acquired artifacts preserve source-object refs and relationship IDs so Case can connect independently acquired evidence through shared lineage;
23. Case renders shared-source artifact lineage separately from acquisition provenance;
24. containment mutates live process/network state while acquired artifact lineage remains immutable;
25. unit and browser coverage exercise relationship pivots, artifact lineage, containment preservation, validation, and reset;
26. synthetic-host history models process start/termination, file activity, service state, configuration change, and network open/close facts separately from current host state;
27. history is deterministically sorted by timestamp/id and can be filtered by process, file, service, configuration, or connection object;
28. scenario compilation derives only authoritative timestamp-backed lifecycle facts and exact canonical network tuples, with optional authored activity for facts not otherwise represented;
29. invalid activity timestamps, duplicate IDs, missing endpoints, and mismatched process/connection ownership fail validation before analyst use;
30. Range exposes controlled `history` queries and safe relationship/history pivots without arbitrary shell execution;
31. history results acquire into Case as immutable typed `history` artifacts carrying source refs, explicit time bounds, relationship lineage, and network indicators;
32. default `FIN-LT-04` history mixes benign Teams activity with the suspicious Word/PowerShell/network chain so analysts can compare competing explanations over time;
33. containment changes live process/network state without rewriting authored/derived activity, and unit/browser coverage verifies filtering, acquisition, reset, validation, and history preservation;
34. host history is a Range control-plane evidence surface rather than a synthetic operating-system capability;
35. service startup policy is modeled separately from service runtime state in both live host state and immutable historical activity;
36. controlled `set-startup` operations change startup policy without implicitly starting/stopping services and emit canonical `HOST_SERVICE_STARTUP_MODE_CHANGED` events only for material changes;
37. service startup-policy events carry exact previous/current values into validation, SIEM searchable fields/messages, EDR Range response history, deterministic replay, and reset behavior.

## Immediate implementation priorities

1. Increase default-scenario host-side ambiguity beyond the first history pass: add more normal processes, files, logs, connections, service activity, and plausible competing explanations without scripted command-following.
2. Deepen file/configuration/recovery lifecycle where it materially improves investigation, including validation that eradication and recovery change system state without rewriting historical facts.
3. Make more incident response happen in host/system context and ensure every material change remains explainable through canonical history.
4. Add richer artifact/entity graph workflows in Case, including analyst-friendly pivots, filtering, and eventual graph query/navigation without turning source facts into conclusions.
5. Define the Stage 2B runtime-provider contract so synthetic and container-backed assets expose a compatible higher-level Range investigation interface.
6. Introduce one ephemeral container-backed Linux/service asset only after isolation, resource/time limits, teardown, and telemetry instrumentation are explicit and testable.
7. Add microVM/full-VM fidelity later for Windows/AD/appliance scenarios that cannot be represented credibly with lower-fidelity assets.

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

- deterministic synthetic-host infrastructure is the immediate fidelity layer and now has an end-to-end browser, evidence, relationship, lineage, time-aware history, and service-persistence implementation;
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
