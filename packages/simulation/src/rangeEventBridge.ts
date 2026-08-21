import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import {
  InMemoryEventStore,
} from "./eventStore";

import type {
  HostEvidenceCollectedEvent,
  SimulationEvent,
} from "./simulationEvent";

import {
  executeSyntheticHostCommand,
} from "./syntheticHost";

import type {
  SyntheticHostCommandExecution,
  SyntheticHostCommandInvocation,
  SyntheticHostReplayResult,
  SyntheticHostState,
} from "./syntheticHost";

export interface RangeCanonicalReplayResult
  extends SyntheticHostReplayResult {
  events: readonly SimulationEvent[];
}

export interface RangeEvidenceEventInput {
  id: EntityId;
  timestamp: SimulationTimestamp;
  deviceId: EntityId;
  actorId?: EntityId;
  invocation: SyntheticHostCommandInvocation;
  execution: SyntheticHostCommandExecution;
}

function closeProcessOwnedNetwork(
  state: SyntheticHostState,
  processId: number,
): SyntheticHostState {
  const connections = state.network.connections.map(
    (connection) =>
      connection.processId === processId &&
      connection.state !== "closed"
        ? {
            ...connection,
            state: "closed" as const,
          }
        : connection,
  );
  const listeners = state.network.listeners.filter(
    (listener) =>
      listener.processId !== processId,
  );

  return {
    ...state,
    network: {
      connections,
      listeners,
    },
  };
}

function mutationEvent(
  previousState: SyntheticHostState,
  invocation: SyntheticHostCommandInvocation,
  execution: SyntheticHostCommandExecution,
): SimulationEvent | null {
  if (
    execution.result.kind !== "mutation" ||
    !execution.result.changed
  ) {
    return null;
  }

  const base = {
    id: `${invocation.id}-event`,
    timestamp: invocation.timestamp,
    source: "range",
    ...(invocation.actorId === undefined
      ? {}
      : { actorId: invocation.actorId }),
    subjectId: previousState.deviceId,
  };

  switch (invocation.command.type) {
    case "terminate_process": {
      const process = previousState.processes.find(
        (candidate) =>
          candidate.pid === invocation.command.pid,
      );

      if (!process) {
        throw new Error(
          `Range mutation event cannot resolve process ${invocation.command.pid}.`,
        );
      }

      const closedConnectionIds = previousState.network.connections
        .filter(
          (connection) =>
            connection.processId === process.pid &&
            connection.state !== "closed",
        )
        .map((connection) => connection.id);
      const closedListenerIds = previousState.network.listeners
        .filter(
          (listener) =>
            listener.processId === process.pid,
        )
        .map((listener) => listener.id);

      return {
        ...base,
        type: "HOST_PROCESS_TERMINATED",
        payload: {
          deviceId: previousState.deviceId,
          processId: String(process.pid),
          image: process.image,
          ...(process.accountId === undefined
            ? {}
            : { accountId: process.accountId }),
          closedConnectionIds,
          closedListenerIds,
        },
      };
    }

    case "start_service":
    case "stop_service": {
      const service = previousState.services.find(
        (candidate) =>
          candidate.name === invocation.command.name,
      );

      if (!service) {
        throw new Error(
          `Range mutation event cannot resolve service ${invocation.command.name}.`,
        );
      }

      return {
        ...base,
        type: "HOST_SERVICE_STATE_CHANGED",
        payload: {
          deviceId: previousState.deviceId,
          serviceName: service.name,
          previousStatus: service.status,
          status:
            invocation.command.type === "start_service"
              ? "running"
              : "stopped",
        },
      };
    }

    case "quarantine_file": {
      const file = previousState.files.find(
        (candidate) =>
          candidate.path === invocation.command.path,
      );

      if (!file) {
        throw new Error(
          `Range mutation event cannot resolve file ${invocation.command.path}.`,
        );
      }

      return {
        ...base,
        type: "HOST_FILE_QUARANTINED",
        payload: {
          deviceId: previousState.deviceId,
          originalPath: file.path,
          quarantinePath:
            invocation.command.destinationPath,
          ...(file.sha256 === undefined
            ? {}
            : { sha256: file.sha256 }),
        },
      };
    }

    default:
      return null;
  }
}

export function replayRangeCommandsWithEvents(
  initialState: SyntheticHostState,
  invocations:
    readonly SyntheticHostCommandInvocation[],
): RangeCanonicalReplayResult {
  let state = structuredClone(initialState);
  const executions:
    SyntheticHostCommandExecution[] = [];
  const events: SimulationEvent[] = [];
  const invocationIds = new Set<string>();
  let previousTimestamp: string | undefined;

  for (const invocation of invocations) {
    if (invocationIds.has(invocation.id)) {
      throw new Error(
        `Synthetic host command id already exists in replay: ${invocation.id}`,
      );
    }

    if (
      previousTimestamp !== undefined &&
      invocation.timestamp < previousTimestamp
    ) {
      throw new Error(
        `Synthetic host command timestamp regressed at ${invocation.id}.`,
      );
    }

    invocationIds.add(invocation.id);
    previousTimestamp = invocation.timestamp;

    const previousState = state;
    let execution =
      executeSyntheticHostCommand(
        state,
        invocation,
      );

    if (
      invocation.command.type === "terminate_process" &&
      execution.result.kind === "mutation" &&
      execution.result.changed
    ) {
      execution = {
        ...execution,
        state: closeProcessOwnedNetwork(
          execution.state,
          invocation.command.pid,
        ),
      };
    }

    const event = mutationEvent(
      previousState,
      invocation,
      execution,
    );

    state = execution.state;
    executions.push(execution);

    if (event) {
      events.push(event);
    }
  }

  return {
    state,
    executions,
    events,
  };
}

function uniqueStrings(
  values: readonly (string | undefined)[],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          Boolean(value),
      ),
    ),
  ];
}

export function createRangeEvidenceEvent(
  input: RangeEvidenceEventInput,
): HostEvidenceCollectedEvent {
  const result = input.execution.result;
  let evidenceKind:
    HostEvidenceCollectedEvent["payload"]["evidenceKind"];
  let targetId: string;
  let summary: string;
  let relatedEntityIds: EntityId[] = [
    input.deviceId,
  ];
  let indicatorIps: string[] = [];

  switch (result.kind) {
    case "file":
      evidenceKind = "file";
      targetId = result.file.path;
      summary =
        `Range file ${result.file.path}; sha256 ${result.file.sha256 ?? "unknown"}; quarantined ${String(result.file.quarantined)}.`;
      break;

    case "files":
      evidenceKind = "file";
      targetId = "filesystem-listing";
      summary =
        `Range filesystem listing captured ${result.files.length} file(s).`;
      break;

    case "process":
      evidenceKind = "process";
      targetId = String(result.process.pid);
      summary =
        `Range process ${result.process.pid}: ${result.process.image} ${result.process.commandLine}`;
      relatedEntityIds = uniqueStrings([
        input.deviceId,
        result.process.accountId,
      ]);
      break;

    case "processes":
      evidenceKind = "process";
      targetId = "process-list";
      summary =
        `Range process inventory captured ${result.processes.length} process(es).`;
      relatedEntityIds = uniqueStrings([
        input.deviceId,
        ...result.processes.map(
          (process) => process.accountId,
        ),
      ]);
      break;

    case "service":
      evidenceKind = "service";
      targetId = result.service.name;
      summary =
        `Range service ${result.service.name} is ${result.service.status}; executable ${result.service.executable}.`;
      break;

    case "services":
      evidenceKind = "service";
      targetId = "service-list";
      summary =
        `Range service inventory captured ${result.services.length} service(s).`;
      break;

    case "users":
      evidenceKind = "identity";
      targetId = "local-users";
      summary =
        `Range local-user inventory captured ${result.users.length} user(s).`;
      break;

    case "groups":
      evidenceKind = "identity";
      targetId = "local-groups";
      summary =
        `Range local-group inventory captured ${result.groups.length} group(s).`;
      break;

    case "configuration":
      evidenceKind = "configuration";
      targetId = result.key;
      summary =
        `Range configuration ${result.key} = ${String(result.value)}.`;
      break;

    case "logs":
      evidenceKind = "log";
      targetId =
        input.invocation.command.type === "list_logs"
          ? input.invocation.command.channel ?? "all-logs"
          : "logs";
      summary =
        `Range log collection captured ${result.logs.length} record(s).`;
      break;

    case "network":
      evidenceKind = "network";
      targetId = "network-state";
      summary =
        `Range network state captured ${result.network.connections.length} connection(s) and ${result.network.listeners.length} listener(s).`;
      indicatorIps = uniqueStrings([
        ...result.network.connections.flatMap(
          (connection) => [
            connection.localAddress,
            connection.remoteAddress,
          ],
        ),
        ...result.network.listeners.map(
          (listener) => listener.address,
        ),
      ]);
      break;

    case "mutation":
      throw new Error(
        "Range mutation results are already recorded as canonical host-action events and cannot be collected as duplicate evidence.",
      );
  }

  return {
    id: input.id,
    timestamp: input.timestamp,
    source: "range",
    ...(input.actorId === undefined
      ? {}
      : { actorId: input.actorId }),
    subjectId: input.deviceId,
    type: "HOST_EVIDENCE_COLLECTED",
    payload: {
      deviceId: input.deviceId,
      evidenceKind,
      targetId,
      summary,
      relatedEntityIds,
      indicatorIps,
    },
  };
}

export function mergeSimulationEventHistory(
  ...streams: readonly (readonly SimulationEvent[])[]
): readonly SimulationEvent[] {
  const indexed = streams.flatMap(
    (events, streamIndex) =>
      events.map((event, eventIndex) => ({
        event,
        order: `${String(streamIndex).padStart(4, "0")}:${String(eventIndex).padStart(8, "0")}`,
      })),
  );

  indexed.sort((left, right) => {
    const timestamp =
      left.event.timestamp.localeCompare(
        right.event.timestamp,
      );

    return timestamp !== 0
      ? timestamp
      : left.order.localeCompare(right.order);
  });

  const events = indexed.map(
    ({ event }) => event,
  );

  new InMemoryEventStore(events);

  return events;
}
