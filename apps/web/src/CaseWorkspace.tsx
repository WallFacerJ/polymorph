import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import {
  addAnalystHypothesis,
  addAnalystTask,
  buildCaseDecisionRecords,
  buildCaseEvidenceRecords,
  buildIncidentCaseReport,
  setAnalystCasePhase,
  updateAnalystHypothesisStatus,
  updateAnalystTaskStatus,
} from "./simulationAdapter";

import type {
  AnalystCasePhase,
  AnalystCaseState,
  AnalystHypothesisStatus,
  AnalystTaskStatus,
  ScenarioAction,
  ScenarioOutcome,
  SimulationEvent,
} from "./simulationAdapter";

import "./CaseWorkspace.css";

interface CaseWorkspaceProps {
  scenarioId: string;
  scenarioName: string;
  state: AnalystCaseState;
  events: readonly SimulationEvent[];
  actions: readonly ScenarioAction[];
  performedActionIds: readonly string[];
  outcome: ScenarioOutcome;
  finalized: boolean;
  findingTitle: string;
  findingSummary: string;
  selectedEvidenceIds: readonly string[];
  caseError: string | null;
  onFindingTitleChange: (value: string) => void;
  onFindingSummaryChange: (value: string) => void;
  onToggleEvidence: (eventId: string) => void;
  onSubmitFinding: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onCaseChange: (state: AnalystCaseState) => void;
  onSearchSiem: (query: string) => void;
  onOpenEndpoint: () => void;
  onOpenIdentity: () => void;
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  ).format(new Date(timestamp));
}

function readableStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function CaseWorkspace({
  scenarioId,
  scenarioName,
  state,
  events,
  actions,
  performedActionIds,
  outcome,
  finalized,
  findingTitle,
  findingSummary,
  selectedEvidenceIds,
  caseError,
  onFindingTitleChange,
  onFindingSummaryChange,
  onToggleEvidence,
  onSubmitFinding,
  onCaseChange,
  onSearchSiem,
  onOpenEndpoint,
  onOpenIdentity,
}: CaseWorkspaceProps) {
  const [hypothesisTitle, setHypothesisTitle] =
    useState("");
  const [hypothesisSummary, setHypothesisSummary] =
    useState("");
  const [taskTitle, setTaskTitle] =
    useState("");
  const [taskOwner, setTaskOwner] =
    useState("SOC analyst");
  const [commandError, setCommandError] =
    useState<string | null>(null);

  const evidence = useMemo(
    () =>
      buildCaseEvidenceRecords(
        state,
        events,
      ),
    [state, events],
  );

  const decisions = useMemo(
    () =>
      buildCaseDecisionRecords(
        actions,
        performedActionIds,
      ),
    [actions, performedActionIds],
  );

  const report = useMemo(
    () =>
      buildIncidentCaseReport(
        state,
        actions,
        performedActionIds,
        outcome,
      ),
    [
      state,
      actions,
      performedActionIds,
      outcome,
    ],
  );

  const indicators = useMemo(() => {
    const values = new Set<string>();

    for (const record of evidence) {
      for (const indicator of record.indicators) {
        values.add(
          `${indicator.kind}:${indicator.value}`,
        );
      }
    }

    return [...values].map((entry) => {
      const separator = entry.indexOf(":");

      return {
        kind: entry.slice(0, separator),
        value: entry.slice(separator + 1),
      };
    });
  }, [evidence]);

  const changePhase = (
    phase: AnalystCasePhase,
  ) => {
    if (finalized) {
      return;
    }

    onCaseChange(
      setAnalystCasePhase(state, phase),
    );
  };

  const createHypothesis = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (finalized) {
      return;
    }

    try {
      const next = addAnalystHypothesis(
        state,
        {
          id: `hypothesis-${state.hypotheses.length + 1}`,
          title: hypothesisTitle,
          summary: hypothesisSummary,
          evidenceEventIds:
            selectedEvidenceIds,
        },
        events,
      );

      onCaseChange(next);
      setHypothesisTitle("");
      setHypothesisSummary("");
      setCommandError(null);
    } catch (caught: unknown) {
      setCommandError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      );
    }
  };

  const createTask = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (finalized) {
      return;
    }

    try {
      const next = addAnalystTask(
        state,
        {
          id: `task-${state.tasks.length + 1}`,
          title: taskTitle,
          owner: taskOwner,
          evidenceEventIds:
            selectedEvidenceIds,
        },
        events,
      );

      onCaseChange(next);
      setTaskTitle("");
      setCommandError(null);
    } catch (caught: unknown) {
      setCommandError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      );
    }
  };

  const changeHypothesisStatus = (
    hypothesisId: string,
    status: AnalystHypothesisStatus,
  ) => {
    if (finalized) {
      return;
    }

    onCaseChange(
      updateAnalystHypothesisStatus(
        state,
        hypothesisId,
        status,
      ),
    );
  };

  const changeTaskStatus = (
    taskId: string,
    status: AnalystTaskStatus,
  ) => {
    if (finalized) {
      return;
    }

    onCaseChange(
      updateAnalystTaskStatus(
        state,
        taskId,
        status,
      ),
    );
  };

  return (
    <div
      className="case-command"
      role="region"
      aria-label="Case incident command workspace"
    >
      <header className="case-command-header">
        <div>
          <p className="eyebrow">
            Polymorph Case / Incident Command
          </p>
          <h3>{scenarioName}</h3>
          <p>
            Coordinate evidence, hypotheses, investigation work, response decisions, and incident state from one shared case.
          </p>
          <code>{scenarioId}</code>
        </div>

        <div className="case-command-summary">
          <label>
            <span>Incident phase</span>
            <select
              aria-label="Incident phase"
              value={state.phase}
              disabled={finalized}
              onChange={(event) =>
                changePhase(
                  event.target.value as AnalystCasePhase,
                )
              }
            >
              <option value="investigation">
                Investigation
              </option>
              <option value="containment">
                Containment
              </option>
              <option value="recovery">
                Recovery
              </option>
              <option value="closed">
                Closed
              </option>
            </select>
          </label>
          <div className="case-command-metrics">
            <span>
              <strong>{evidence.length}</strong>
              evidence
            </span>
            <span>
              <strong>{state.hypotheses.length}</strong>
              hypotheses
            </span>
            <span>
              <strong>{report.openTaskCount}</strong>
              open tasks
            </span>
            <span>
              <strong>{decisions.length}</strong>
              decisions
            </span>
          </div>
        </div>
      </header>

      <div className="case-command-layout">
        <section
          className="case-command-evidence"
          aria-label="Case evidence ledger"
        >
          <div className="case-pane-heading">
            <div>
              <p className="eyebrow">Evidence ledger</p>
              <h4>Collected source evidence</h4>
            </div>
            <span>
              {selectedEvidenceIds.length} selected
            </span>
          </div>

          {evidence.length === 0 ? (
            <div className="case-command-empty">
              Collect events from SIEM, Endpoint, Identity, or Investigation to begin building the case.
            </div>
          ) : (
            <div className="case-evidence-ledger">
              {evidence.map((record) => {
                const selected =
                  selectedEvidenceIds.includes(
                    record.eventId,
                  );

                return (
                  <article
                    key={record.eventId}
                    className={
                      selected
                        ? "case-evidence-item selected"
                        : "case-evidence-item"
                    }
                  >
                    <label className="case-evidence-select">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={finalized}
                        onChange={() =>
                          onToggleEvidence(
                            record.eventId,
                          )
                        }
                      />
                      <span className={`case-source-badge ${record.primaryTool}`}>
                        {record.primaryTool}
                      </span>
                      <span className="case-evidence-main">
                        <strong>{record.message}</strong>
                        <small>
                          {record.eventId} · {formatTimestamp(record.timestamp)}
                        </small>
                      </span>
                    </label>

                    <div className="case-evidence-context">
                      {record.relatedEntityIds.map(
                        (entityId) => (
                          <code key={entityId}>
                            {entityId}
                          </code>
                        ),
                      )}
                      {record.indicators.map(
                        (indicator) => (
                          <span
                            className="case-indicator-chip"
                            key={`${indicator.kind}-${indicator.value}`}
                          >
                            {indicator.kind}: {indicator.value}
                          </span>
                        ),
                      )}
                    </div>

                    <div className="case-evidence-actions">
                      <button
                        type="button"
                        onClick={() =>
                          onSearchSiem(
                            `eventId:${record.eventId}`,
                          )
                        }
                      >
                        Open exact in SIEM
                      </button>
                      {record.primaryTool === "identity" && (
                        <button
                          type="button"
                          onClick={onOpenIdentity}
                        >
                          Open Identity
                        </button>
                      )}
                      {record.primaryTool === "edr" && (
                        <button
                          type="button"
                          onClick={onOpenEndpoint}
                        >
                          Open Endpoint
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="case-command-work"
          aria-label="Case investigation work"
        >
          <div className="case-work-section">
            <div className="case-pane-heading">
              <div>
                <p className="eyebrow">Hypotheses</p>
                <h4>Test explanations against evidence</h4>
              </div>
              <span>{state.hypotheses.length}</span>
            </div>

            <form
              className="case-command-form"
              onSubmit={createHypothesis}
            >
              <label>
                Hypothesis title
                <input
                  value={hypothesisTitle}
                  disabled={finalized}
                  onChange={(event) =>
                    setHypothesisTitle(
                      event.target.value,
                    )
                  }
                  placeholder="Compromised Finance identity drove endpoint execution"
                />
              </label>
              <label>
                Hypothesis summary
                <textarea
                  value={hypothesisSummary}
                  disabled={finalized}
                  rows={3}
                  onChange={(event) =>
                    setHypothesisSummary(
                      event.target.value,
                    )
                  }
                  placeholder="State the explanation you are testing and why the selected evidence matters."
                />
              </label>
              <div className="case-form-footer">
                <small>
                  {selectedEvidenceIds.length} selected evidence
                </small>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    finalized ||
                    hypothesisTitle.trim().length === 0 ||
                    hypothesisSummary.trim().length === 0 ||
                    selectedEvidenceIds.length === 0
                  }
                >
                  Add hypothesis
                </button>
              </div>
            </form>

            <div className="case-artifact-list">
              {state.hypotheses.map((hypothesis) => (
                <article
                  className="case-artifact-card"
                  key={hypothesis.id}
                >
                  <div>
                    <strong>{hypothesis.title}</strong>
                    <p>{hypothesis.summary}</p>
                    <small>
                      {hypothesis.evidenceEventIds.length} evidence · {hypothesis.id}
                    </small>
                  </div>
                  <label>
                    <span>Status</span>
                    <select
                      aria-label={`Hypothesis status ${hypothesis.title}`}
                      value={hypothesis.status}
                      disabled={finalized}
                      onChange={(event) =>
                        changeHypothesisStatus(
                          hypothesis.id,
                          event.target.value as AnalystHypothesisStatus,
                        )
                      }
                    >
                      <option value="open">Open</option>
                      <option value="supported">Supported</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </div>

          <div className="case-work-section">
            <div className="case-pane-heading">
              <div>
                <p className="eyebrow">Tasks</p>
                <h4>Coordinate investigation work</h4>
              </div>
              <span>{state.tasks.length}</span>
            </div>

            <form
              className="case-command-form case-task-form"
              onSubmit={createTask}
            >
              <label>
                Task title
                <input
                  value={taskTitle}
                  disabled={finalized}
                  onChange={(event) =>
                    setTaskTitle(event.target.value)
                  }
                  placeholder="Validate suspicious external IP across telemetry"
                />
              </label>
              <label>
                Task owner
                <input
                  value={taskOwner}
                  disabled={finalized}
                  onChange={(event) =>
                    setTaskOwner(event.target.value)
                  }
                />
              </label>
              <div className="case-form-footer">
                <small>
                  {selectedEvidenceIds.length} selected evidence
                </small>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    finalized ||
                    taskTitle.trim().length === 0 ||
                    taskOwner.trim().length === 0 ||
                    selectedEvidenceIds.length === 0
                  }
                >
                  Add task
                </button>
              </div>
            </form>

            <div className="case-artifact-list">
              {state.tasks.map((task) => (
                <article
                  className="case-artifact-card"
                  key={task.id}
                >
                  <div>
                    <strong>{task.title}</strong>
                    <p>Owner: {task.owner}</p>
                    <small>
                      {task.evidenceEventIds.length} evidence · {task.id}
                    </small>
                  </div>
                  <label>
                    <span>Status</span>
                    <select
                      aria-label={`Task status ${task.title}`}
                      value={task.status}
                      disabled={finalized}
                      onChange={(event) =>
                        changeTaskStatus(
                          task.id,
                          event.target.value as AnalystTaskStatus,
                        )
                      }
                    >
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </div>

          <div className="case-work-section case-finding-work">
            <div className="case-pane-heading">
              <div>
                <p className="eyebrow">Finding</p>
                <h3>Build your evidence-backed finding</h3>
              </div>
              <span>{state.findings.length}</span>
            </div>

            <form
              className="finding-form"
              onSubmit={onSubmitFinding}
            >
              <label>
                Finding title
                <input
                  type="text"
                  value={findingTitle}
                  disabled={finalized}
                  onChange={(event) =>
                    onFindingTitleChange(
                      event.target.value,
                    )
                  }
                  placeholder="Account compromise led to suspicious PowerShell"
                />
              </label>

              <label>
                Analyst summary
                <textarea
                  value={findingSummary}
                  disabled={finalized}
                  onChange={(event) =>
                    onFindingSummaryChange(
                      event.target.value,
                    )
                  }
                  rows={5}
                  placeholder="Explain what happened and why the selected evidence supports your conclusion."
                />
              </label>

              <div className="finding-form-footer">
                <small>
                  {selectedEvidenceIds.length} evidence linked
                </small>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    finalized ||
                    findingTitle.trim().length === 0 ||
                    findingSummary.trim().length === 0 ||
                    selectedEvidenceIds.length === 0
                  }
                >
                  Save finding
                </button>
              </div>
            </form>

            {caseError && (
              <div className="case-error">
                {caseError}
              </div>
            )}
          </div>

          {commandError && (
            <div className="case-error">
              {commandError}
            </div>
          )}
        </section>

        <aside
          className="case-command-side"
          aria-label="Case command summary"
        >
          <section className="case-command-card">
            <p className="eyebrow">Indicators</p>
            <h4>Observed in case evidence</h4>
            {indicators.length === 0 ? (
              <p className="case-muted">
                No supported indicators have been extracted from collected evidence.
              </p>
            ) : (
              <div className="case-indicator-list">
                {indicators.map((indicator) => (
                  <code key={`${indicator.kind}-${indicator.value}`}>
                    {indicator.kind}: {indicator.value}
                  </code>
                ))}
              </div>
            )}
          </section>

          <section className="case-command-card">
            <p className="eyebrow">Response decisions</p>
            <h4>Performed operations</h4>
            {decisions.length === 0 ? (
              <p className="case-muted">
                No response actions have been performed in this run.
              </p>
            ) : (
              <div className="case-decision-list">
                {decisions.map((decision) => (
                  <article key={decision.actionId}>
                    <strong>{decision.label}</strong>
                    <p>{decision.description}</p>
                    <small>
                      {decision.eventIds.join(", ")}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="case-command-card">
            <p className="eyebrow">Incident report</p>
            <h4>Derived case summary</h4>
            <p className="case-report-summary">
              {report.summary}
            </p>
            <dl className="case-report-grid">
              <div>
                <dt>Phase</dt>
                <dd>{readableStatus(report.phase)}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{readableStatus(report.outcomeStatus)}</dd>
              </div>
              <div>
                <dt>Supported hypotheses</dt>
                <dd>{report.supportedHypothesisCount}</dd>
              </div>
              <div>
                <dt>Completed tasks</dt>
                <dd>{report.completedTaskCount}</dd>
              </div>
            </dl>
          </section>

          <section className="case-command-card">
            <p className="eyebrow">Findings</p>
            <h4>Case conclusions</h4>
            {state.findings.length === 0 ? (
              <p className="case-muted">
                No findings have been saved yet.
              </p>
            ) : (
              <div className="case-finding-list">
                {state.findings.map((finding) => (
                  <article key={finding.id}>
                    <strong>{finding.title}</strong>
                    <p>{finding.summary}</p>
                    <small>
                      {finding.evidenceEventIds.length} evidence · {finding.id}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
