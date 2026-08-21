import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import {
  InMemoryEventStore,
} from "./eventStore";

import {
  createRangeArtifact,
} from "./rangeArtifact";

import {
  createRangeArtifactEvidenceEvent,
} from "./rangeArtifactEvent";

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

import type {
  SyntheticHostActivity,
} from "./syntheticHostActivity";

import type {
  SyntheticHostAuthoredRelationship,
} from "./syntheticHostRelationship";

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
  relationships?:
    readonly SyntheticHostAuthoredRelationship[];
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
      const command = invocation.command;
      const process = previousState.processes.find(
        (candidate) =>
          candidate.pid === command.pid,
      );

      if (!process) {
        throw new Error(
          `Range mutation event cannot resolve process ${command.pid}.`,
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
      const command = invocation.command;
      const service = previousState.services.find(
        (candidate) =>
          candidate.name === command.name,
      );

      if (!service) {
        throw new Error(
          `Range mutation event cannot resolve service ${command.name}.`,
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
            command.type === "start_service"
              ? "running"
              : "stopped",
        },
      };
    }

    case "quarantine_file": {
      const command = invocation.command;
      const file = previousState.files.find(
        (candidate) =>
          candidate.path === command.path,
      );

      if (!file) {
        throw new Error(
          `Range mutation event cannot resolve file ${command.path}.`,
        );
      }

      return {
        ...base,
        type: "HOST_FILE_QUARANTINED",
        payload: {
          deviceId: previousState.deviceId,
          originalPath: file.path,
          quarantinePath:
            command.destinationPath,
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
  activityRecords:
    readonly SyntheticHostActivity[] = [],
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
        activityRecords,
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

export function createRangeEvidenceEvent(
  input: RangeEvidenceEventInput,
): HostEvidenceCollectedEvent {
  if (input.execution.result.kind === "mutation") {
    throw new Error(
      "Range mutation results are already recorded as canonical host-action events and cannot be collected as duplicate evidence.",
    );
  }

  const artifact = createRangeArtifact({
    id: `${input.invocation.id}-artifact`,
    acquiredAt: input.timestamp,
    deviceId: input.deviceId,
    invocation: input.invocation,
    execution: input.execution,
    relationships: input.relationships,
  });

  return createRangeArtifactEvidenceEvent({
    id: input.id,
    timestamp: input.timestamp,
    ...(input.actorId === undefined
      ? {}
      : { actorId: input.actorId }),
    artifact,
  });
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
