import type {
  DomainEvent,
  EntityId,
  EntityStatus,
} from "@polymorph/domain";

import type {
  RangeArtifact,
} from "./rangeArtifact";

export type EventOf<
  TType extends string,
  TPayload,
> = DomainEvent<
  TType,
  TPayload
>;

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------

export interface AuthLoginSucceededPayload {
  accountId: EntityId;
  userId: EntityId;
  deviceId?: EntityId;
  applicationId?: EntityId;
  sourceIp?: string;
}

export type AuthLoginSucceededEvent =
  EventOf<
    "AUTH_LOGIN_SUCCEEDED",
    AuthLoginSucceededPayload
  >;

export type AuthFailureReason =
  | "invalid_credentials"
  | "disabled_account"
  | "mfa_failed"
  | "unknown_account"
  | "other";

export interface AuthLoginFailedPayload {
  username: string;
  reason: AuthFailureReason;
  applicationId?: EntityId;
  deviceId?: EntityId;
  sourceIp?: string;
}

export type AuthLoginFailedEvent =
  EventOf<
    "AUTH_LOGIN_FAILED",
    AuthLoginFailedPayload
  >;

export type AuthenticationEvent =
  | AuthLoginSucceededEvent
  | AuthLoginFailedEvent;

// -----------------------------------------------------------------------------
// Identity
// -----------------------------------------------------------------------------

export interface AccountDisabledPayload {
  accountId: EntityId;
  reason?: string;
}

export type AccountDisabledEvent =
  EventOf<
    "ACCOUNT_DISABLED",
    AccountDisabledPayload
  >;

export interface AccountEnabledPayload {
  accountId: EntityId;
  reason?: string;
}

export type AccountEnabledEvent =
  EventOf<
    "ACCOUNT_ENABLED",
    AccountEnabledPayload
  >;

export type IdentityEvent =
  | AccountDisabledEvent
  | AccountEnabledEvent;

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------

export interface SessionStartedPayload {
  sessionId: EntityId;
  accountId: EntityId;
  deviceId?: EntityId;
  applicationId?: EntityId;
}

export type SessionStartedEvent =
  EventOf<
    "SESSION_STARTED",
    SessionStartedPayload
  >;

export interface SessionRevokedPayload {
  sessionId: EntityId;
  reason?: string;
}

export type SessionRevokedEvent =
  EventOf<
    "SESSION_REVOKED",
    SessionRevokedPayload
  >;

export type SessionEvent =
  | SessionStartedEvent
  | SessionRevokedEvent;

// -----------------------------------------------------------------------------
// Process execution
// -----------------------------------------------------------------------------

export interface ProcessStartedPayload {
  deviceId: EntityId;
  processId: string;
  image: string;
  commandLine?: string;
  parentProcessId?: string;
  accountId?: EntityId;
}

export type ProcessStartedEvent =
  EventOf<
    "PROCESS_STARTED",
    ProcessStartedPayload
  >;

export type ProcessEvent =
  ProcessStartedEvent;

// -----------------------------------------------------------------------------
// File activity
// -----------------------------------------------------------------------------

export type FileAccessOperation =
  | "read"
  | "write"
  | "create"
  | "delete"
  | "execute";

export interface FileAccessedPayload {
  fileId: EntityId;
  operation: FileAccessOperation;
  deviceId?: EntityId;
  accountId?: EntityId;
}

export type FileAccessedEvent =
  EventOf<
    "FILE_ACCESSED",
    FileAccessedPayload
  >;

export type FileEvent =
  FileAccessedEvent;

// -----------------------------------------------------------------------------
// Network activity
// -----------------------------------------------------------------------------

export type NetworkProtocol =
  | "tcp"
  | "udp"
  | "icmp";

export interface NetworkConnectionPayload {
  deviceId: EntityId;
  protocol: NetworkProtocol;
  sourceIp: string;
  destinationIp: string;
  sourcePort?: number;
  destinationPort?: number;
}

export type NetworkConnectionEvent =
  EventOf<
    "NETWORK_CONNECTION",
    NetworkConnectionPayload
  >;

export type NetworkEvent =
  NetworkConnectionEvent;

// -----------------------------------------------------------------------------
// Endpoint activity
// -----------------------------------------------------------------------------

export interface EndpointHeartbeatPayload {
  deviceId: EntityId;
  status: EntityStatus;
  ipAddresses: string[];
}

export type EndpointHeartbeatEvent =
  EventOf<
    "ENDPOINT_HEARTBEAT",
    EndpointHeartbeatPayload
  >;

export type EndpointEvent =
  EndpointHeartbeatEvent;

// -----------------------------------------------------------------------------
// Polymorph Range host activity
// -----------------------------------------------------------------------------

export interface HostProcessTerminatedPayload {
  deviceId: EntityId;
  processId: string;
  image: string;
  accountId?: EntityId;
  closedConnectionIds: string[];
  closedListenerIds: string[];
}

export type HostProcessTerminatedEvent =
  EventOf<
    "HOST_PROCESS_TERMINATED",
    HostProcessTerminatedPayload
  >;

export interface HostServiceStateChangedPayload {
  deviceId: EntityId;
  serviceName: string;
  previousStatus: "running" | "stopped";
  status: "running" | "stopped";
}

export type HostServiceStateChangedEvent =
  EventOf<
    "HOST_SERVICE_STATE_CHANGED",
    HostServiceStateChangedPayload
  >;

export interface HostFileQuarantinedPayload {
  deviceId: EntityId;
  originalPath: string;
  quarantinePath: string;
  sha256?: string;
}

export type HostFileQuarantinedEvent =
  EventOf<
    "HOST_FILE_QUARANTINED",
    HostFileQuarantinedPayload
  >;

export type HostEvidenceKind =
  | "file"
  | "process"
  | "service"
  | "identity"
  | "configuration"
  | "log"
  | "network";

export type HostEvidenceAcquisitionMethod =
  "controlled_range_command";

export type HostEvidenceIntegrity =
  | {
      status: "authored";
      algorithm: "sha256";
      value: string;
    }
  | {
      status: "unavailable";
      reason: "source_did_not_provide_integrity";
    };

export interface HostEvidenceCollectedPayload {
  deviceId: EntityId;
  evidenceKind: HostEvidenceKind;
  artifactId?: EntityId;
  artifact?: RangeArtifact;
  sourceInvocationId?: string;
  acquisitionMethod?: HostEvidenceAcquisitionMethod;
  acquiredAt?: string;
  sourceReference?: string;
  integrity?: HostEvidenceIntegrity;
  targetId: string;
  summary: string;
  relatedEntityIds: EntityId[];
  indicatorIps: string[];
}

export type HostEvidenceCollectedEvent =
  EventOf<
    "HOST_EVIDENCE_COLLECTED",
    HostEvidenceCollectedPayload
  >;

export type HostEvent =
  | HostProcessTerminatedEvent
  | HostServiceStateChangedEvent
  | HostFileQuarantinedEvent
  | HostEvidenceCollectedEvent;

// -----------------------------------------------------------------------------
// Security detections
// -----------------------------------------------------------------------------

export type AlertSeverity =
  | "informational"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface AlertCreatedPayload {
  alertId: EntityId;
  title: string;
  severity: AlertSeverity;
  applicationId?: EntityId;
  relatedEventIds: EntityId[];
  relatedEntityIds: EntityId[];
}

export type AlertCreatedEvent =
  EventOf<
    "ALERT_CREATED",
    AlertCreatedPayload
  >;

export type SecurityEvent =
  AlertCreatedEvent;

// -----------------------------------------------------------------------------
// Polymorph event union
// -----------------------------------------------------------------------------

export type SimulationEvent =
  | AuthenticationEvent
  | IdentityEvent
  | SessionEvent
  | ProcessEvent
  | FileEvent
  | NetworkEvent
  | EndpointEvent
  | HostEvent
  | SecurityEvent;

export type SimulationEventType =
  SimulationEvent["type"];
