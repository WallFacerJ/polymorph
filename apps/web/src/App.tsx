import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";

import {
  ScenarioOutcomePanel,
} from "./ScenarioOutcomePanel";

import {
  ScenarioResultPanel,
} from "./ScenarioResultPanel";

import {
  ResponseActionPanel,
} from "./ResponseActionPanel";

import {
  InstructorReviewPanel,
} from "./InstructorReviewPanel";

import {
  ScenarioControls,
} from "./ScenarioControls";

import {
  SiemWorkspace,
} from "./SiemWorkspace";

import {
  EdrWorkspace,
} from "./EdrWorkspace";

import {
  EdrHostActivityPanel,
} from "./EdrHostActivityPanel";

import {
  IdentityWorkspace,
} from "./IdentityWorkspace";

import {
  CaseWorkspace,
} from "./CaseWorkspace";

import {
  RangeWorkspace,
} from "./RangeWorkspace";

import {
  addAnalystFinding,
  collectAnalystEvidence,
  createAnalystCaseState,
  createRangeEvidenceEvent,
  edrHostActivityProjection,
  edrProjection,
  finalizeScenarioState,
  getScenarioState,
  getScenarioSyntheticHostRelationships,
  identityProjection,
  mergeSimulationEventHistory,
  rebuildProjection,
  replayRangeCommandsWithEvents,
  siemProjection,
} from "./simulationAdapter";

import type {
  ScenarioDefinition,
  SimulationEvent,
  SyntheticHostCommand,
  SyntheticHostCommandInvocation,
} from "./simulationAdapter";

import {
  loadScenario,
  resolveScenarioPath,
} from "./scenarioLoader";

type WorkspaceView =
  | "alerts"
  | "timeline"
  | "siem"
  | "endpoint"
  | "identity"
  | "case"
  | "range";

const navItems: ReadonlyArray<{
  id: WorkspaceView;
  label: string;
}> = [
  { id: "alerts", label: "Alerts" },
  { id: "timeline", label: "Investigation" },
  { id: "siem", label: "SIEM Search" },
  { id: "endpoint", label: "Endpoint" },
  { id: "identity", label: "Identity" },
  { id: "case", label: "Case" },
  { id: "range", label: "Range" },
];

function formatTimestamp(
  timestamp: string | undefined,
): string {
  if (!timestamp) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
  ).format(new Date(timestamp));
}

interface ScenarioWorkspaceProps {
  scenario: ScenarioDefinition;
  scenarioPath: string;
  instructorMode: boolean;
}

function ScenarioWorkspace({
  scenario,
  scenarioPath,
  instructorMode,
}: ScenarioWorkspaceProps) {
  const context =
    scenario.investigation;

  const [activeView, setActiveView] =
    useState<WorkspaceView>(
      "alerts",
    );
  const [performedActionIds, setPerformedActionIds] =
    useState<string[]>([]);
  const [finalized, setFinalized] =
    useState(false);
  const [analystCase, setAnalystCase] =
    useState(() =>
      createAnalystCaseState(),
    );
  const [findingTitle, setFindingTitle] =
    useState("");
  const [findingSummary, setFindingSummary] =
    useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] =
    useState<string[]>([]);
  const [caseError, setCaseError] =
    useState<string | null>(null);
  const [siemPivot, setSiemPivot] =
    useState({
      query: "",
      nonce: 0,
    });
  const [rangeDeviceId, setRangeDeviceId] =
    useState(context.deviceId);
  const [rangeInvocations, setRangeInvocations] =
    useState<SyntheticHostCommandInvocation[]>([]);
  const [rangeEvidenceEvents, setRangeEvidenceEvents] =
    useState<SimulationEvent[]>([]);

  const scenarioState = useMemo(
    () =>
      finalized
        ? finalizeScenarioState(
            scenario,
            performedActionIds,
          )
        : getScenarioState(
            scenario,
            performedActionIds,
          ),
    [
      scenario,
      performedActionIds,
      finalized,
    ],
  );

  const rangeInitialHost = useMemo(
    () =>
      (scenario.syntheticHosts ?? []).find(
        (host) =>
          host.deviceId === rangeDeviceId,
      ),
    [scenario.syntheticHosts, rangeDeviceId],
  );

  const rangeRelationships = useMemo(
    () =>
      getScenarioSyntheticHostRelationships(
        scenario,
        rangeDeviceId,
      ),
    [scenario, rangeDeviceId],
  );

  const rangeReplay = useMemo(
    () =>
      rangeInitialHost
        ? replayRangeCommandsWithEvents(
            rangeInitialHost,
            rangeInvocations,
          )
        : null,
    [rangeInitialHost, rangeInvocations],
  );

  const canonicalEvents = useMemo(
    () =>
      mergeSimulationEventHistory(
        scenarioState.events,
        rangeReplay?.events ?? [],
        rangeEvidenceEvents,
      ),
    [
      scenarioState.events,
      rangeReplay,
      rangeEvidenceEvents,
    ],
  );

  const projections = useMemo(
    () => ({
      identity: rebuildProjection(
        identityProjection,
        canonicalEvents,
      ),
      edr: rebuildProjection(
        edrProjection,
        canonicalEvents,
      ),
      edrHost: rebuildProjection(
        edrHostActivityProjection,
        canonicalEvents,
      ),
      siem: rebuildProjection(
        siemProjection,
        canonicalEvents,
      ),
    }),
    [canonicalEvents],
  );

  const user =
    scenarioState.world.users[
      context.userId
    ];
  const account =
    scenarioState.world.accounts[
      context.accountId
    ];
  const device =
    scenarioState.world.devices[
      context.deviceId
    ];
  const session =
    scenarioState.world.sessions[
      context.sessionId
    ];

  const alert =
    projections.edr.alerts.find(
      (candidate) =>
        candidate.alertId ===
        context.alertId,
    );

  const responseActions =
    context.responseActionIds.flatMap(
      (actionId) => {
        const action =
          scenario.actions.find(
            (candidate) =>
              candidate.id === actionId,
          );

        return action ? [action] : [];
      },
    );

  const responseSucceeded =
    scenarioState.outcome.status ===
    "succeeded";

  const runStatusLabel =
    scenarioState.finalized
      ? responseSucceeded
        ? "Succeeded"
        : "Failed"
      : responseSucceeded
        ? "Objectives met"
        : performedActionIds.length > 0
          ? "Response in progress"
          : "Needs action";

  const isEvidenceCollected = (
    eventId: string | undefined,
  ): boolean =>
    eventId !== undefined &&
    analystCase.collectedEventIds.includes(
      eventId,
    );

  const collectEvidence = (
    eventId: string | undefined,
  ) => {
    if (!eventId || scenarioState.finalized) {
      return;
    }

    setCaseError(null);
    setAnalystCase((current) =>
      collectAnalystEvidence(
        current,
        eventId,
        canonicalEvents,
      ),
    );
  };

  const toggleFindingEvidence = (
    eventId: string,
  ) => {
    if (scenarioState.finalized) {
      return;
    }

    setSelectedEvidenceIds((current) =>
      current.includes(eventId)
        ? current.filter(
            (candidate) =>
              candidate !== eventId,
          )
        : [
            ...current,
            eventId,
          ],
    );
  };

  const submitFinding = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (scenarioState.finalized) {
      return;
    }

    try {
      const next = addAnalystFinding(
        analystCase,
        {
          id:
            `finding-${analystCase.findings.length + 1}`,
          title: findingTitle,
          summary: findingSummary,
          evidenceEventIds:
            selectedEvidenceIds,
        },
        canonicalEvents,
      );

      setAnalystCase(next);
      setFindingTitle("");
      setFindingSummary("");
      setSelectedEvidenceIds([]);
      setCaseError(null);
    } catch (caught: unknown) {
      setCaseError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      );
    }
  };

  const performResponseAction = (
    actionId: string,
  ) => {
    if (
      scenarioState.finalized ||
      performedActionIds.includes(
        actionId,
      ) ||
      !responseActions.some(
        (action) =>
          action.id === actionId,
      )
    ) {
      return;
    }

    setPerformedActionIds((current) =>
      current.includes(actionId)
        ? current
        : [
            ...current,
            actionId,
          ],
    );
    setActiveView("timeline");
  };

  const finalizeInvestigation = () => {
    if (scenarioState.finalized) {
      return;
    }

    setFinalized(true);
    setActiveView("timeline");
  };

  const openSiem = (
    query: string,
  ) => {
    setSiemPivot((current) => ({
      query,
      nonce: current.nonce + 1,
    }));
    setActiveView("siem");
  };

  const openRange = (deviceId: string) => {
    if (deviceId !== rangeDeviceId) {
      setRangeInvocations([]);
    }
    setRangeDeviceId(deviceId);
    setActiveView("range");
  };

  const executeRangeCommand = (
    command: SyntheticHostCommand,
  ): string | null => {
    if (scenarioState.finalized) {
      return "The finalized run is read-only. Reset the scenario to operate the host again.";
    }

    if (!rangeInitialHost) {
      return `No synthetic host is authored for device ${rangeDeviceId}.`;
    }

    const latestTimestamp =
      canonicalEvents.at(-1)?.timestamp ??
      scenario.openingEvents.at(-1)?.timestamp ??
      scenario.initialWorld.simulationTime;
    const invocation: SyntheticHostCommandInvocation = {
      id: `range-command-${rangeInvocations.length + 1}`,
      timestamp: new Date(
        Date.parse(latestTimestamp) + 1000,
      ).toISOString(),
      command,
    };

    try {
      replayRangeCommandsWithEvents(
        rangeInitialHost,
        [
          ...rangeInvocations,
          invocation,
        ],
      );
      setRangeInvocations((current) => [
        ...current,
        invocation,
      ]);
      return null;
    } catch (caught: unknown) {
      return caught instanceof Error
        ? caught.message
        : String(caught);
    }
  };

  const collectRangeExecution = (
    executionIndex: number,
  ): string | null => {
    if (scenarioState.finalized) {
      return "The finalized run is read-only. Reset the scenario to collect new Range evidence.";
    }

    if (!rangeInitialHost || !rangeReplay) {
      return "No active synthetic host execution is available.";
    }

    const invocation = rangeInvocations[executionIndex];
    const execution = rangeReplay.executions[executionIndex];

    if (!invocation || !execution) {
      return "Range execution is unavailable.";
    }

    const evidenceId = `${invocation.id}-evidence`;

    if (
      rangeEvidenceEvents.some(
        (event) => event.id === evidenceId,
      )
    ) {
      return null;
    }

    try {
      const latestTimestamp =
        canonicalEvents.at(-1)?.timestamp ??
        invocation.timestamp;
      const evidenceEvent =
        createRangeEvidenceEvent({
          id: evidenceId,
          timestamp: new Date(
            Math.max(
              Date.parse(latestTimestamp),
              Date.parse(invocation.timestamp),
            ) + 1,
          ).toISOString(),
          deviceId: rangeInitialHost.deviceId,
          invocation,
          execution,
          relationships: rangeRelationships,
        });
      const nextRangeEvidenceEvents = [
        ...rangeEvidenceEvents,
        evidenceEvent,
      ];
      const nextHistory =
        mergeSimulationEventHistory(
          scenarioState.events,
          rangeReplay.events,
          nextRangeEvidenceEvents,
        );

      setRangeEvidenceEvents(
        nextRangeEvidenceEvents,
      );
      setAnalystCase((current) =>
        collectAnalystEvidence(
          current,
          evidenceEvent.id,
          nextHistory,
        ),
      );
      setCaseError(null);
      return null;
    } catch (caught: unknown) {
      return caught instanceof Error
        ? caught.message
        : String(caught);
    }
  };

  const resetScenario = () => {
    setPerformedActionIds([]);
    setFinalized(false);
    setAnalystCase(
      createAnalystCaseState(),
    );
    setFindingTitle("");
    setFindingSummary("");
    setSelectedEvidenceIds([]);
    setCaseError(null);
    setRangeInvocations([]);
    setRangeEvidenceEvents([]);
    setRangeDeviceId(context.deviceId);
    setActiveView("alerts");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">
            Polymorph
          </p>
          <h1>Security Console</h1>
          <p className="sidebar-copy">
            Synthetic analyst workspace
          </p>

          <nav className="workspace-nav">
            {navItems.filter((item) =>
              item.id !== "range" ||
              (scenario.syntheticHosts?.length ?? 0) > 0,
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  activeView === item.id
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() =>
                  setActiveView(item.id)
                }
              >
                {item.label}
                {item.id === "case" &&
                  analystCase.collectedEventIds.length > 0 && (
                    <span className="nav-count">
                      {analystCase.collectedEventIds.length}
                    </span>
                  )}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>
            Deterministic run
            <small>
              {scenarioPath}
            </small>
          </span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              Training scenario
            </p>
            <h2>
              {scenario.name}
            </h2>
            <p className="scenario-description">
              {scenario.description}
            </p>
          </div>

          <div className="topbar-actions">
            <ScenarioControls
              scenarioPath={scenarioPath}
              instructorMode={instructorMode}
            />
            <span
              className={
                scenarioState.finalized &&
                responseSucceeded
                  ? "incident-state contained"
                  : "incident-state active"
              }
            >
              {runStatusLabel}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={resetScenario}
            >
              Reset scenario
            </button>
          </div>
        </header>

        {activeView === "alerts" && (
          <section className="workspace-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  Alert queue
                </p>
                <h3>1 alert requires investigation</h3>
              </div>
            </div>

            <article className="alert-card">
              <div className="alert-card-header">
                <span className="severity-badge">
                  {alert?.severity ?? "high"}
                </span>
                <span className="timestamp">
                  {formatTimestamp(
                    alert?.timestamp,
                  )}
                </span>
              </div>

              <h3>
                {alert?.title ??
                  "Security alert"}
              </h3>
              <p>
                Correlated identity and endpoint telemetry indicates activity that requires analyst review.
              </p>

              <div className="detail-grid compact">
                <div>
                  <span>User</span>
                  <strong>
                    {user?.displayName ?? "—"}
                  </strong>
                </div>
                <div>
                  <span>Endpoint</span>
                  <strong>
                    {device?.hostname ?? "—"}
                  </strong>
                </div>
                <div>
                  <span>Account</span>
                  <strong>
                    {account?.username ?? "—"}
                  </strong>
                </div>
                <div>
                  <span>Case evidence</span>
                  <strong>
                    {analystCase.collectedEventIds.length}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setActiveView("timeline")
                }
              >
                Open investigation
              </button>
            </article>
          </section>
        )}

        {activeView === "siem" && (
          <section className="workspace-section siem-section">
            <SiemWorkspace
              key={`siem-${siemPivot.nonce}`}
              records={projections.siem.events}
              initialQuery={siemPivot.query}
              finalized={scenarioState.finalized}
              isCollected={isEvidenceCollected}
              onCollect={collectEvidence}
              onOpenCase={() => setActiveView("case")}
            />
          </section>
        )}

        {activeView === "timeline" && (
          <section className="workspace-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  Investigation
                </p>
                <h3>Correlated incident timeline</h3>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={finalizeInvestigation}
                disabled={scenarioState.finalized}
              >
                {scenarioState.finalized
                  ? "Investigation finalized"
                  : "Finalize investigation"}
              </button>
            </div>

            <ScenarioOutcomePanel
              outcome={scenarioState.outcome}
            />

            <ResponseActionPanel
              actions={responseActions}
              performedActionIds={scenarioState.performedActionIds}
              score={scenarioState.score}
              finalized={scenarioState.finalized}
              onPerform={performResponseAction}
            />

            {scenarioState.finalized && (
              <ScenarioResultPanel
                status={scenarioState.outcome.status}
                score={scenarioState.score}
                actionCount={scenarioState.performedActionIds.length}
                evidenceCount={analystCase.collectedEventIds.length}
                findingCount={analystCase.findings.length}
              />
            )}

            {scenarioState.finalized &&
              instructorMode && (
                <InstructorReviewPanel
                  scenario={scenario}
                  state={scenarioState}
                />
              )}

            <div className="summary-grid">
              <article className="summary-card">
                <span>Account</span>
                <strong>
                  {account?.username ?? "—"}
                </strong>
                <small>
                  Status: {account?.status ?? "—"}
                </small>
              </article>
              <article className="summary-card">
                <span>Endpoint</span>
                <strong>
                  {device?.hostname ?? "—"}
                </strong>
                <small>
                  {device?.operatingSystem ?? "—"}
                </small>
              </article>
              <article className="summary-card">
                <span>Session</span>
                <strong>
                  {session?.status ?? "—"}
                </strong>
                <small>
                  {session?.id ?? "No session"}
                </small>
              </article>
              <article className="summary-card">
                <span>Case evidence</span>
                <strong>
                  {analystCase.collectedEventIds.length}
                </strong>
                <small>
                  {analystCase.findings.length} findings
                </small>
              </article>
            </div>

            <div className="timeline-list">
              {projections.siem.events.map(
                (event) => {
                  const collected =
                    isEvidenceCollected(
                      event.eventId,
                    );

                  return (
                    <article
                      key={event.eventId}
                      className="timeline-item"
                    >
                      <div
                        className={`timeline-marker ${event.family}`}
                      />
                      <div className="timeline-content">
                        <div className="timeline-meta">
                          <span>
                            {event.family}
                          </span>
                          <time>
                            {formatTimestamp(
                              event.timestamp,
                            )}
                          </time>
                        </div>
                        <strong>
                          {event.message}
                        </strong>
                        <div className="timeline-actions">
                          <small>
                            {event.eventType} · {event.source}
                          </small>
                          <button
                            type="button"
                            className="evidence-button"
                            onClick={() =>
                              collectEvidence(
                                event.eventId,
                              )
                            }
                            disabled={scenarioState.finalized || collected}
                          >
                            {collected
                              ? "Evidence collected"
                              : "Collect evidence"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </section>
        )}

        {activeView === "endpoint" && (
          <section className="workspace-section edr-section">
            <EdrWorkspace
              state={projections.edr}
              devices={Object.values(scenarioState.world.devices)}
              initialDeviceId={context.deviceId}
              finalized={scenarioState.finalized}
              isCollected={isEvidenceCollected}
              onCollect={collectEvidence}
              onSearchSiem={openSiem}
              onOpenCase={() => setActiveView("case")}
              rangeDeviceIds={(scenario.syntheticHosts ?? []).map(
                (host) => host.deviceId,
              )}
              onOpenRange={openRange}
            />
            <EdrHostActivityPanel
              state={projections.edrHost}
              deviceId={context.deviceId}
              onSearchSiem={openSiem}
            />
          </section>
        )}

        {activeView === "identity" && (
          <section className="workspace-section identity-section">
            <IdentityWorkspace
              world={scenarioState.world}
              state={projections.identity}
              initialAccountId={context.accountId}
              actions={responseActions}
              performedActionIds={scenarioState.performedActionIds}
              finalized={scenarioState.finalized}
              isCollected={isEvidenceCollected}
              onCollect={collectEvidence}
              onPerformAction={performResponseAction}
              onSearchSiem={openSiem}
              onOpenCase={() => setActiveView("case")}
            />
          </section>
        )}

        {activeView === "range" && (
          <section className="workspace-section range-section">
            {rangeInitialHost &&
            rangeReplay &&
            scenarioState.world.devices[rangeDeviceId] ? (
              <RangeWorkspace
                device={scenarioState.world.devices[rangeDeviceId]}
                host={rangeReplay.state}
                relationships={rangeRelationships}
                invocations={rangeInvocations}
                executions={rangeReplay.executions}
                finalized={scenarioState.finalized}
                onExecute={executeRangeCommand}
                isExecutionCollected={(invocationId) =>
                  rangeEvidenceEvents.some(
                    (event) =>
                      event.id === `${invocationId}-evidence`,
                  )
                }
                onCollectExecution={collectRangeExecution}
              />
            ) : (
              <div className="case-empty">
                No synthetic Range host is authored for this device.
              </div>
            )}
          </section>
        )}

        {activeView === "case" && (
          <section className="workspace-section case-section">
            <CaseWorkspace
              scenarioId={scenario.id}
              scenarioName={scenario.name}
              state={analystCase}
              events={canonicalEvents}
              actions={responseActions}
              performedActionIds={scenarioState.performedActionIds}
              outcome={scenarioState.outcome}
              finalized={scenarioState.finalized}
              findingTitle={findingTitle}
              findingSummary={findingSummary}
              selectedEvidenceIds={selectedEvidenceIds}
              caseError={caseError}
              onFindingTitleChange={setFindingTitle}
              onFindingSummaryChange={setFindingSummary}
              onToggleEvidence={toggleFindingEvidence}
              onSubmitFinding={submitFinding}
              onCaseChange={setAnalystCase}
              onSearchSiem={openSiem}
              onOpenEndpoint={() => setActiveView("endpoint")}
              onOpenIdentity={() => setActiveView("identity")}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function App() {
  const instructorMode = useMemo(
    () =>
      new URLSearchParams(
        window.location.search,
      ).get("mode") === "instructor",
    [],
  );

  const scenarioPath = useMemo(
    () =>
      resolveScenarioPath(
        window.location.search,
      ),
    [],
  );

  const [scenario, setScenario] =
    useState<ScenarioDefinition | null>(
      null,
    );
  const [error, setError] =
    useState<string | null>(null);
  const [reloadToken, setReloadToken] =
    useState(0);

  useEffect(() => {
    let cancelled = false;

    setScenario(null);
    setError(null);

    loadScenario(scenarioPath)
      .then((loaded) => {
        if (!cancelled) {
          setScenario(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : String(caught),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioPath, reloadToken]);

  if (error) {
    return (
      <main className="scenario-load-state">
        <p className="eyebrow">
          Scenario validation failed
        </p>
        <h1>Polymorph could not load this scenario.</h1>
        <p>
          Fix the JSON or semantic error, then retry.
        </p>
        <code className="scenario-path">
          {scenarioPath}
        </code>
        <pre className="scenario-error">
          {error}
        </pre>
        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setReloadToken((current) =>
              current + 1,
            )
          }
        >
          Retry scenario
        </button>
      </main>
    );
  }

  if (!scenario) {
    return (
      <main className="scenario-load-state">
        <p className="eyebrow">
          Loading scenario
        </p>
        <h1>Preparing deterministic training run…</h1>
        <code className="scenario-path">
          {scenarioPath}
        </code>
      </main>
    );
  }

  return (
    <ScenarioWorkspace
      scenario={scenario}
      scenarioPath={scenarioPath}
      instructorMode={instructorMode}
    />
  );
}

export default App;
