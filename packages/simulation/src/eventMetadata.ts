import type {
  SimulationEvent,
} from "./simulationEvent";

import {
  assertNever,
} from "./assertNever";

export type SimulationEventFamily =
  | "authentication"
  | "identity"
  | "session"
  | "process"
  | "file"
  | "network"
  | "endpoint"
  | "host"
  | "security";

export function getSimulationEventFamily(
  event: SimulationEvent,
): SimulationEventFamily {
  switch (event.type) {
    case "AUTH_LOGIN_SUCCEEDED":
    case "AUTH_LOGIN_FAILED":
      return "authentication";

    case "ACCOUNT_DISABLED":
    case "ACCOUNT_ENABLED":
      return "identity";

    case "SESSION_STARTED":
    case "SESSION_REVOKED":
      return "session";

    case "PROCESS_STARTED":
      return "process";

    case "FILE_ACCESSED":
      return "file";

    case "NETWORK_CONNECTION":
      return "network";

    case "ENDPOINT_HEARTBEAT":
      return "endpoint";

    case "HOST_PROCESS_TERMINATED":
    case "HOST_SERVICE_STATE_CHANGED":
    case "HOST_SERVICE_STARTUP_MODE_CHANGED":
    case "HOST_FILE_QUARANTINED":
    case "HOST_EVIDENCE_COLLECTED":
      return "host";

    case "ALERT_CREATED":
      return "security";

    default:
      return assertNever(event);
  }
}
