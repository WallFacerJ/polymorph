import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import {
  RANGE_COMMAND_HELP,
  parseRangeCommand,
} from "./rangeCommandParser";

import {
  getSyntheticHostProcessInvestigation,
} from "./simulationAdapter";

import type {
  SyntheticHostAuthoredRelationship,
  SyntheticHostCommand,
  SyntheticHostCommandExecution,
  SyntheticHostCommandInvocation,
  SyntheticHostObjectRef,
  SyntheticHostResolvedRelationship,
  SyntheticHostState,
} from "./simulationAdapter";

import "./RangeWorkspace.css";

interface RangeDeviceSummary {
  id: string;
  hostname: string;
  operatingSystem: string;
  ipAddresses: readonly string[];
}

interface RangeWorkspaceProps {
  device: RangeDeviceSummary;
  host: SyntheticHostState;
  relationships:
    readonly SyntheticHostAuthoredRelationship[];
  invocations:
    readonly SyntheticHostCommandInvocation[];
  executions:
    readonly SyntheticHostCommandExecution[];
  finalized: boolean;
  onExecute: (
    command: SyntheticHostCommand,
  ) => string | null;
  isExecutionCollected: (
    invocationId: string,
  ) => boolean;
  onCollectExecution: (
    executionIndex: number,
  ) => string | null;
}

function basename(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path;
}

function commandLabel(
  command: SyntheticHostCommand,
): string {
  switch (command.type) {
    case "list_files":
      return command.prefix
        ? `ls ${command.prefix}`
        : "ls";
    case "read_file":
      return `cat ${command.path}`;
    case "list_processes":
      return "ps";
    case "get_process":
      return `process ${command.pid}`;
    case "list_services":
      return "services";
    case "get_service":
      return `service ${command.name}`;
    case "list_users":
      return "users";
    case "list_groups":
      return "groups";
    case "read_config":
      return `config ${command.key}`;
    case "list_logs":
      return command.channel
        ? `logs ${command.channel}`
        : "logs";
    case "list_network":
      return "net";
    case "start_service":
      return `start-service ${command.name}`;
    case "stop_service":
      return `stop-service ${command.name}`;
    case "terminate_process":
      return `kill ${command.pid}`;
    case "quarantine_file":
      return `quarantine ${command.path} ${command.destinationPath}`;
  }
}

function resultLines(
  execution: SyntheticHostCommandExecution,
): readonly string[] {
  const result = execution.result;

  switch (result.kind) {
    case "files":
      return result.files.length === 0
        ? ["No files matched."]
        : result.files.map(
            (file) =>
              `${file.quarantined ? "Q" : "-"} ${file.owner.padEnd(12)} ${file.sha256?.slice(0, 12) ?? "no-hash"} ${file.path}`,
          );

    case "file":
      return [
        `path: ${result.file.path}`,
        `owner: ${result.file.owner}`,
        `sha256: ${result.file.sha256 ?? "—"}`,
        `quarantined: ${String(result.file.quarantined)}`,
        "--- content ---",
        result.file.content,
      ];

    case "processes":
      return result.processes.map(
        (process) =>
          `${String(process.pid).padEnd(6)} ${process.state.padEnd(10)} ppid=${process.parentPid ?? "—"} ${process.image} ${process.commandLine}`,
      );

    case "process":
      return [
        `pid: ${result.process.pid}`,
        `state: ${result.process.state}`,
        `image: ${result.process.image}`,
        `command: ${result.process.commandLine}`,
        `parent: ${result.process.parentPid ?? "—"}`,
      ];

    case "services":
      return result.services.map(
        (service) =>
          `${service.status.padEnd(8)} ${service.startupMode.padEnd(9)} ${service.name} -> ${service.executable}`,
      );

    case "service":
      return [
        `${result.service.name}: ${result.service.status}`,
        `startup: ${result.service.startupMode}`,
        `executable: ${result.service.executable}`,
      ];

    case "users":
      return result.users.map(
        (user) =>
          `${user.enabled ? "enabled" : "disabled"} ${user.username} [${user.groups.join(", ")}]`,
      );

    case "groups":
      return result.groups.map(
        (group) =>
          `${group.name}: ${group.members.join(", ") || "—"}`,
      );

    case "configuration":
      return [
        `${result.key} = ${String(result.value)}`,
      ];

    case "logs":
      return result.logs.map(
        (record) =>
          `${record.timestamp} ${record.level.toUpperCase()} [${record.channel}] ${record.source}: ${record.message}`,
      );

    case "network":
      return [
        ...result.network.listeners.map(
          (listener) =>
            `LISTEN ${listener.protocol.toUpperCase()} ${listener.address}:${listener.port} pid=${listener.processId ?? "—"}`,
        ),
        ...result.network.connections.map(
          (connection) =>
            `${connection.state.toUpperCase()} ${connection.protocol.toUpperCase()} ${connection.localAddress}:${connection.localPort} -> ${connection.remoteAddress}:${connection.remotePort} pid=${connection.processId ?? "—"}`,
        ),
      ];

    case "mutation":
      return [
        `${result.changed ? "changed" : "unchanged"}: ${result.targetType} ${result.targetId}`,
        execution.audit.summary,
      ];
  }
}

function pivotCommandForRef(
  ref: SyntheticHostObjectRef,
): string | null {
  switch (ref.kind) {
    case "process":
      return `process ${ref.id}`;
    case "file":
      return `cat ${ref.id}`;
    case "service":
      return `service ${ref.id}`;
    case "configuration":
      return `config ${ref.id}`;
    case "connection":
    case "listener":
      return "net";
    case "log":
      return "logs";
    case "local_user":
      return "users";
    case "local_group":
      return "groups";
    case "account":
      return null;
  }
}

function readableRelationship(
  relationship: SyntheticHostResolvedRelationship,
): string {
  const authority =
    relationship.authority === "authored"
      ? "authored fact"
      : "derived from host IDs";
  const type = relationship.type.replaceAll("_", " ");
  const detail = relationship.detail
    ? ` · ${relationship.detail}`
    : "";

  return `${type} · ${authority}${detail}`;
}

export function RangeWorkspace({
  device,
  host,
  relationships,
  invocations,
  executions,
  finalized,
  onExecute,
  isExecutionCollected,
  onCollectExecution,
}: RangeWorkspaceProps) {
  const [input, setInput] = useState("");
  const [localOutput, setLocalOutput] =
    useState<readonly string[]>([
      "Polymorph Range synthetic host session ready.",
      "Type help to list the controlled command vocabulary.",
    ]);
  const [error, setError] =
    useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] =
    useState<number | null>(null);

  const selectedProcessInvestigation = useMemo(
    () => {
      if (selectedProcessId === null) {
        return null;
      }

      try {
        return getSyntheticHostProcessInvestigation(
          host,
          relationships,
          selectedProcessId,
        );
      } catch {
        return null;
      }
    }, [
      host,
      relationships,
      selectedProcessId,
    ]);

  const runningProcesses =
    host.processes.filter(
      (process) =>
        process.state === "running",
    ).length;
  const runningServices =
    host.services.filter(
      (service) =>
        service.status === "running",
    ).length;
  const quarantinedFiles =
    host.files.filter(
      (file) => file.quarantined,
    ).length;

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (finalized) {
      return;
    }

    try {
      const parsed = parseRangeCommand(input);

      if (parsed.kind === "help") {
        setLocalOutput([
          "Supported controlled commands:",
          ...RANGE_COMMAND_HELP.map(
            (command) => `  ${command}`,
          ),
        ]);
        setInput("");
        setError(null);
        return;
      }

      const runtimeError =
        onExecute(parsed.command);

      if (runtimeError) {
        setError(runtimeError);
        return;
      }

      setLocalOutput([]);
      setInput("");
      setError(null);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      );
    }
  };

  const collectExecution = (
    index: number,
  ) => {
    const runtimeError =
      onCollectExecution(index);

    setError(runtimeError);
  };

  const stagePivot = (
    ref: SyntheticHostObjectRef,
  ) => {
    const command = pivotCommandForRef(ref);

    if (command) {
      setInput(command);
      setError(null);
    }
  };

  return (
    <div
      className="range-workspace"
      role="region"
      aria-label="Range synthetic host workspace"
    >
      <header className="range-header">
        <div>
          <p className="eyebrow">
            Polymorph Range / Synthetic host
          </p>
          <h3>{device.hostname}</h3>
          <p>
            Inspect and operate deterministic host state through a controlled command API. Commands never execute on the browser or runner operating system.
          </p>
        </div>
        <div className="range-host-facts">
          <span>
            <small>Device</small>
            <strong>{device.id}</strong>
          </span>
          <span>
            <small>OS</small>
            <strong>{device.operatingSystem}</strong>
          </span>
          <span>
            <small>IP</small>
            <strong>{device.ipAddresses.join(", ") || "—"}</strong>
          </span>
        </div>
      </header>

      <div className="range-stat-grid">
        <article>
          <span>Processes</span>
          <strong>{runningProcesses}</strong>
          <small>{host.processes.length} modeled</small>
        </article>
        <article>
          <span>Services</span>
          <strong>{runningServices}</strong>
          <small>{host.services.length} modeled</small>
        </article>
        <article>
          <span>Files</span>
          <strong>{host.files.length}</strong>
          <small>{quarantinedFiles} quarantined</small>
        </article>
        <article>
          <span>Connections</span>
          <strong>
            {host.network.connections.filter(
              (connection) =>
                connection.state !== "closed",
            ).length}
          </strong>
          <small>{host.network.listeners.length} listeners</small>
        </article>
      </div>

      <div className="range-layout">
        <section className="range-terminal-pane">
          <div className="range-pane-heading">
            <div>
              <p className="eyebrow">Controlled terminal</p>
              <h4>Investigation session</h4>
            </div>
            <span>{invocations.length} commands</span>
          </div>

          <div
            className="range-terminal-output"
            aria-live="polite"
          >
            {invocations.length === 0 &&
              localOutput.map((line) => (
                <div key={line} className="range-output-line">
                  {line}
                </div>
              ))}

            {invocations.map(
              (invocation, index) => {
                const execution = executions[index];
                const collected =
                  isExecutionCollected(
                    invocation.id,
                  );

                return (
                  <div
                    key={invocation.id}
                    className="range-command-block"
                  >
                    <div className="range-command-line">
                      <span>PSYN&gt;</span>
                      <code>
                        {commandLabel(
                          invocation.command,
                        )}
                      </code>
                    </div>
                    {execution &&
                      resultLines(execution).map(
                        (line, lineIndex) => (
                          <pre
                            key={`${invocation.id}-${lineIndex}`}
                            className="range-output-line"
                          >
                            {line}
                          </pre>
                        ),
                      )}
                    {execution && (
                      <div className="range-audit-line">
                        audit {execution.audit.id} · {execution.audit.timestamp} · {execution.audit.commandType}
                      </div>
                    )}
                    {execution &&
                      execution.result.kind !== "mutation" && (
                        <>
                          <button
                            type="button"
                            className="evidence-button"
                            disabled={finalized || collected}
                            onClick={() =>
                              collectExecution(index)
                            }
                          >
                            {collected
                              ? "Artifact acquired"
                              : finalized
                                ? "Run finalized"
                                : "Acquire artifact to Case"}
                          </button>
                          {collected && (
                            <div className="range-audit-line">
                              artifact {invocation.id}-artifact · immutable acquisition snapshot
                            </div>
                          )}
                        </>
                      )}
                  </div>
                );
              },
            )}

            {invocations.length > 0 &&
              localOutput.map((line) => (
                <div key={line} className="range-output-line">
                  {line}
                </div>
              ))}
          </div>

          <form
            className="range-command-form"
            onSubmit={submit}
          >
            <label htmlFor="range-command-input">
              <span>PSYN&gt;</span>
              <input
                id="range-command-input"
                aria-label="Range command"
                type="text"
                value={input}
                disabled={finalized}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder={
                  finalized
                    ? "Run finalized"
                    : "ps"
                }
              />
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={
                finalized ||
                input.trim().length === 0
              }
            >
              Run
            </button>
          </form>

          {error && (
            <div className="range-command-error">
              {error}
            </div>
          )}
        </section>

        <aside className="range-inspector-pane">
          <div className="range-pane-heading">
            <div>
              <p className="eyebrow">Live synthetic state</p>
              <h4>Host inspector</h4>
            </div>
          </div>

          <section className="range-inspector-section">
            <h5>Processes</h5>
            {host.processes.map((process) => (
              <div
                key={process.pid}
                className={
                  selectedProcessId === process.pid
                    ? "range-inspector-row relationship-selected"
                    : "range-inspector-row"
                }
              >
                <div>
                  <strong>{basename(process.image)}</strong>
                  <code>{process.pid}</code>
                </div>
                <span className={`range-state ${process.state}`}>
                  {process.state}
                </span>
                <small>{process.commandLine}</small>
                <button
                  type="button"
                  className="range-context-button"
                  onClick={() =>
                    setSelectedProcessId(process.pid)
                  }
                >
                  Trace relationships
                </button>
              </div>
            ))}
          </section>

          <section
            className="range-inspector-section range-relationship-section"
            aria-label="Range relationship context"
          >
            <h5>Relationship context</h5>
            {!selectedProcessInvestigation ? (
              <p className="range-relationship-empty">
                Select a process to inspect authoritative parent, account, file, service, configuration, and network lineage.
              </p>
            ) : (
              <>
                <div className="range-relationship-heading">
                  <strong>
                    Process {selectedProcessInvestigation.processId}
                  </strong>
                  <span>
                    {selectedProcessInvestigation.relationships.length} relationship(s)
                  </span>
                </div>

                <div className="range-related-ref-list">
                  {selectedProcessInvestigation.relatedRefs
                    .filter(
                      (ref) =>
                        !(
                          ref.kind === "process" &&
                          ref.id === String(
                            selectedProcessInvestigation.processId,
                          )
                        ),
                    )
                    .map((ref) => {
                      const pivot =
                        pivotCommandForRef(ref);

                      return (
                        <div
                          className="range-related-ref"
                          key={`${ref.kind}-${ref.id}`}
                        >
                          <span>
                            <small>{ref.kind.replaceAll("_", " ")}</small>
                            <code>{ref.id}</code>
                          </span>
                          {pivot && (
                            <button
                              type="button"
                              className="range-context-button"
                              onClick={() => stagePivot(ref)}
                            >
                              Stage {pivot}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="range-relationship-list">
                  {selectedProcessInvestigation.relationships.map(
                    (relationship) => (
                      <div
                        key={relationship.id}
                        className="range-relationship-row"
                      >
                        <code>{relationship.id}</code>
                        <span>
                          {readableRelationship(
                            relationship,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </section>

          <section className="range-inspector-section">
            <h5>Filesystem</h5>
            {host.files.map((file) => (
              <div
                key={file.path}
                className="range-inspector-row"
              >
                <div>
                  <strong>{basename(file.path)}</strong>
                  <span>{file.owner}</span>
                </div>
                <span className={`range-state ${file.quarantined ? "quarantined" : "present"}`}>
                  {file.quarantined
                    ? "quarantined"
                    : "present"}
                </span>
                <small>{file.path}</small>
              </div>
            ))}
          </section>

          <section className="range-inspector-section">
            <h5>Network</h5>
            {host.network.connections.map(
              (connection) => (
                <div
                  key={connection.id}
                  className="range-inspector-row"
                >
                  <div>
                    <strong>
                      {connection.remoteAddress}:{connection.remotePort}
                    </strong>
                    <span>
                      pid {connection.processId ?? "—"}
                    </span>
                  </div>
                  <span className={`range-state ${connection.state}`}>
                    {connection.state}
                  </span>
                  <small>
                    {connection.localAddress}:{connection.localPort} · {connection.protocol.toUpperCase()}
                  </small>
                </div>
              ),
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
