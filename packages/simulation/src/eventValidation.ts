import type {
  EntityId,
} from "@polymorph/domain";

import {
  assertNever,
} from "./assertNever";

import type {
  HostEvidenceCollectedEvent,
  SimulationEvent,
} from "./simulationEvent";

import type {
  WorldState,
} from "./worldState";

function requireEntity<T>(
  entities: Record<EntityId, T>,
  id: EntityId,
  label: string,
): T {
  const entity = entities[id];

  if (!entity) {
    throw new Error(
      `${label} not found: ${id}`,
    );
  }

  return entity;
}

function validateRangeArtifactEvidence(
  event: HostEvidenceCollectedEvent,
): void {
  const artifact = event.payload.artifact;

  if (!artifact) {
    return;
  }

  if (artifact.deviceId !== event.payload.deviceId) {
    throw new Error(
      `Range artifact ${artifact.id} device does not match evidence device ${event.payload.deviceId}.`,
    );
  }

  if (artifact.kind !== event.payload.evidenceKind) {
    throw new Error(
      `Range artifact ${artifact.id} kind does not match evidence kind ${event.payload.evidenceKind}.`,
    );
  }

  if (event.payload.artifactId !== artifact.id) {
    throw new Error(
      `Range artifact id does not match evidence artifact id: ${artifact.id}.`,
    );
  }

  if (
    event.payload.sourceInvocationId !==
    artifact.invocationId
  ) {
    throw new Error(
      `Range artifact ${artifact.id} invocation provenance is inconsistent.`,
    );
  }

  if (
    event.payload.acquisitionMethod !==
    artifact.acquisitionMethod
  ) {
    throw new Error(
      `Range artifact ${artifact.id} acquisition method is inconsistent.`,
    );
  }

  if (event.payload.acquiredAt !== artifact.acquiredAt) {
    throw new Error(
      `Range artifact ${artifact.id} acquisition timestamp is inconsistent.`,
    );
  }

  if (
    event.payload.sourceReference !==
    artifact.sourceReference
  ) {
    throw new Error(
      `Range artifact ${artifact.id} source reference is inconsistent.`,
    );
  }

  if (
    JSON.stringify(event.payload.integrity) !==
    JSON.stringify(artifact.integrity)
  ) {
    throw new Error(
      `Range artifact ${artifact.id} integrity metadata is inconsistent.`,
    );
  }
}

export function validateSimulationEvent(
  world: WorldState,
  event: SimulationEvent,
): void {
  switch (event.type) {
    case "AUTH_LOGIN_SUCCEEDED": {
      const account =
        requireEntity(
          world.accounts,
          event.payload.accountId,
          "Account",
        );

      requireEntity(
        world.users,
        event.payload.userId,
        "User",
      );

      if (
        account.userId !==
        event.payload.userId
      ) {
        throw new Error(
          `Account ${account.id} does not belong to user ${event.payload.userId}`,
        );
      }

      if (event.payload.deviceId) {
        requireEntity(
          world.devices,
          event.payload.deviceId,
          "Device",
        );
      }

      if (
        event.payload.applicationId
      ) {
        requireEntity(
          world.applications,
          event.payload.applicationId,
          "Application",
        );
      }

      return;
    }

    case "AUTH_LOGIN_FAILED": {
      if (event.payload.deviceId) {
        requireEntity(
          world.devices,
          event.payload.deviceId,
          "Device",
        );
      }

      if (
        event.payload.applicationId
      ) {
        requireEntity(
          world.applications,
          event.payload.applicationId,
          "Application",
        );
      }

      return;
    }

    case "ACCOUNT_DISABLED":
    case "ACCOUNT_ENABLED":
      requireEntity(
        world.accounts,
        event.payload.accountId,
        "Account",
      );

      return;

    case "SESSION_STARTED": {
      const {
        sessionId,
        accountId,
        deviceId,
        applicationId,
      } = event.payload;

      if (world.sessions[sessionId]) {
        throw new Error(
          `Session already exists: ${sessionId}`,
        );
      }

      requireEntity(
        world.accounts,
        accountId,
        "Account",
      );

      if (deviceId) {
        requireEntity(
          world.devices,
          deviceId,
          "Device",
        );
      }

      if (applicationId) {
        requireEntity(
          world.applications,
          applicationId,
          "Application",
        );
      }

      return;
    }

    case "SESSION_REVOKED":
      requireEntity(
        world.sessions,
        event.payload.sessionId,
        "Session",
      );

      return;

    case "PROCESS_STARTED":
      requireEntity(
        world.devices,
        event.payload.deviceId,
        "Device",
      );

      if (event.payload.accountId) {
        requireEntity(
          world.accounts,
          event.payload.accountId,
          "Account",
        );
      }

      return;

    case "FILE_ACCESSED":
      requireEntity(
        world.files,
        event.payload.fileId,
        "File",
      );

      if (event.payload.deviceId) {
        requireEntity(
          world.devices,
          event.payload.deviceId,
          "Device",
        );
      }

      if (event.payload.accountId) {
        requireEntity(
          world.accounts,
          event.payload.accountId,
          "Account",
        );
      }

      return;

    case "NETWORK_CONNECTION":
    case "ENDPOINT_HEARTBEAT":
      requireEntity(
        world.devices,
        event.payload.deviceId,
        "Device",
      );

      return;

    case "HOST_PROCESS_TERMINATED":
      requireEntity(
        world.devices,
        event.payload.deviceId,
        "Device",
      );

      if (event.payload.accountId) {
        requireEntity(
          world.accounts,
          event.payload.accountId,
          "Account",
        );
      }

      return;

    case "HOST_SERVICE_STATE_CHANGED":
    case "HOST_FILE_QUARANTINED":
      requireEntity(
        world.devices,
        event.payload.deviceId,
        "Device",
      );

      return;

    case "HOST_EVIDENCE_COLLECTED":
      requireEntity(
        world.devices,
        event.payload.deviceId,
        "Device",
      );
      validateRangeArtifactEvidence(event);

      return;

    case "ALERT_CREATED":
      if (
        event.payload.applicationId
      ) {
        requireEntity(
          world.applications,
          event.payload.applicationId,
          "Application",
        );
      }

      return;

    default:
      return assertNever(event);
  }
}
