import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import type {
  SimulationEvent,
  SimulationEventType,
} from "./simulationEvent";

import type {
  Projection,
} from "./projection";

export interface EdrHostActivityObservation {
  eventId: EntityId;
  timestamp: SimulationTimestamp;
  deviceId: EntityId;
  eventType: SimulationEventType;
  targetId: string;
  summary: string;
}

export interface EdrHostActivityProjectionState {
  observations:
    readonly EdrHostActivityObservation[];
}

function createInitialState():
  EdrHostActivityProjectionState {
  return {
    observations: [],
  };
}

function reduce(
  state: EdrHostActivityProjectionState,
  event: SimulationEvent,
): EdrHostActivityProjectionState {
  let observation:
    EdrHostActivityObservation | undefined;

  switch (event.type) {
    case "HOST_PROCESS_TERMINATED":
      observation = {
        eventId: event.id,
        timestamp: event.timestamp,
        deviceId: event.payload.deviceId,
        eventType: event.type,
        targetId: event.payload.processId,
        summary:
          `Range contained process ${event.payload.processId} (${event.payload.image}); ${event.payload.closedConnectionIds.length} process-owned connection(s) closed.`,
      };
      break;

    case "HOST_SERVICE_STATE_CHANGED":
      observation = {
        eventId: event.id,
        timestamp: event.timestamp,
        deviceId: event.payload.deviceId,
        eventType: event.type,
        targetId: event.payload.serviceName,
        summary:
          `Range changed service ${event.payload.serviceName}: ${event.payload.previousStatus} -> ${event.payload.status}.`,
      };
      break;

    case "HOST_SERVICE_STARTUP_MODE_CHANGED":
      observation = {
        eventId: event.id,
        timestamp: event.timestamp,
        deviceId: event.payload.deviceId,
        eventType: event.type,
        targetId: event.payload.serviceName,
        summary:
          `Range changed service ${event.payload.serviceName} startup mode: ${event.payload.previousStartupMode} -> ${event.payload.startupMode}.`,
      };
      break;

    case "HOST_FILE_QUARANTINED":
      observation = {
        eventId: event.id,
        timestamp: event.timestamp,
        deviceId: event.payload.deviceId,
        eventType: event.type,
        targetId: event.payload.quarantinePath,
        summary:
          `Range quarantined ${event.payload.originalPath} to ${event.payload.quarantinePath}.`,
      };
      break;

    case "HOST_EVIDENCE_COLLECTED":
      observation = {
        eventId: event.id,
        timestamp: event.timestamp,
        deviceId: event.payload.deviceId,
        eventType: event.type,
        targetId: event.payload.targetId,
        summary: event.payload.summary,
      };
      break;

    default:
      return state;
  }

  return {
    observations: [
      ...state.observations,
      observation,
    ],
  };
}

export const edrHostActivityProjection:
  Projection<EdrHostActivityProjectionState> = {
    createInitialState,
    reduce,
  };

export function getEdrHostActivityForDevice(
  state: EdrHostActivityProjectionState,
  deviceId: EntityId,
): readonly EdrHostActivityObservation[] {
  return state.observations
    .filter(
      (observation) =>
        observation.deviceId === deviceId,
    )
    .sort((left, right) => {
      const timestamp =
        left.timestamp.localeCompare(
          right.timestamp,
        );

      return timestamp !== 0
        ? timestamp
        : left.eventId.localeCompare(
            right.eventId,
          );
    });
}
