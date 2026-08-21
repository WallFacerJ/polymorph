import type {
  EntityId,
} from "@polymorph/domain";

import type {
  AnalystCaseState,
} from "./analystCase";

import {
  rebuildProjection,
} from "./projection";

import type {
  ScenarioAction,
} from "./scenario";

import type {
  ScenarioOutcome,
} from "./scenarioOutcome";

import type {
  HostEvidenceIntegrity,
  SimulationEvent,
  SimulationEventType,
} from "./simulationEvent";

import {
  siemProjection,
} from "./siemProjection";

import {
  syntheticHostObjectRefKey,
} from "./syntheticHostRelationship";

import type {
  SyntheticHostObjectRef,
} from "./syntheticHostRelationship";

export type CaseSourceTool =
  | "identity"
  | "edr"
  | "siem"
  | "range";

export interface CaseIndicator {
  kind: "ip";
  value: string;
}

export interface CaseArtifactProvenance {
  artifactId: EntityId;
  sourceInvocationId: string;
  acquisitionMethod: "controlled_range_command";
  acquiredAt: string;
  sourceReference: string;
  integrity: HostEvidenceIntegrity;
  sourceRefs: readonly SyntheticHostObjectRef[];
  sourceRelationshipIds: readonly string[];
}

export interface CaseArtifactLineageLink {
  leftArtifactId: EntityId;
  rightArtifactId: EntityId;
  sharedSourceRefs:
    readonly SyntheticHostObjectRef[];
}

export interface CaseEvidenceRecord {
  eventId: EntityId;
  timestamp: string;
  eventType: SimulationEventType;
  source: string;
  primaryTool: CaseSourceTool;
  message: string;
  relatedEntityIds: readonly EntityId[];
  indicators: readonly CaseIndicator[];
  artifact?: CaseArtifactProvenance;
}

export interface CaseDecisionRecord {
  actionId: EntityId;
  label: string;
  description: string;
  eventIds: readonly EntityId[];
}

export interface IncidentCaseReport {
  phase: AnalystCaseState["phase"];
  outcomeStatus: ScenarioOutcome["status"];
  evidenceCount: number;
  findingCount: number;
  hypothesisCount: number;
  supportedHypothesisCount: number;
  openTaskCount: number;
  completedTaskCount: number;
  decisionCount: number;
  summary: string;
}

function primaryToolForEvent(
  type: SimulationEventType,
): CaseSourceTool {
  switch (type) {
    case "AUTH_LOGIN_SUCCEEDED":
    case "AUTH_LOGIN_FAILED":
    case "ACCOUNT_DISABLED":
    case "ACCOUNT_ENABLED":
    case "SESSION_STARTED":
    case "SESSION_REVOKED":
      return "identity";

    case "PROCESS_STARTED":
    case "FILE_ACCESSED":
    case "NETWORK_CONNECTION":
    case "ENDPOINT_HEARTBEAT":
    case "ALERT_CREATED":
      return "edr";

    case "HOST_PROCESS_TERMINATED":
    case "HOST_SERVICE_STATE_CHANGED":
    case "HOST_SERVICE_STARTUP_MODE_CHANGED":
    case "HOST_FILE_QUARANTINED":
    case "HOST_EVIDENCE_COLLECTED":
      return "range";
  }
}

function uniqueStrings(
  values: readonly (string | undefined)[],
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function getKnownEntityIds(
  event: SimulationEvent,
): readonly EntityId[] {
  const shared = [
    event.actorId,
    event.subjectId,
  ];

  switch (event.type) {
    case "AUTH_LOGIN_SUCCEEDED":
      return uniqueStrings([
        ...shared,
        event.payload.accountId,
        event.payload.userId,
        event.payload.deviceId,
        event.payload.applicationId,
      ]);

    case "AUTH_LOGIN_FAILED":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
        event.payload.applicationId,
      ]);

    case "ACCOUNT_DISABLED":
    case "ACCOUNT_ENABLED":
      return uniqueStrings([
        ...shared,
        event.payload.accountId,
      ]);

    case "SESSION_STARTED":
      return uniqueStrings([
        ...shared,
        event.payload.sessionId,
        event.payload.accountId,
        event.payload.deviceId,
        event.payload.applicationId,
      ]);

    case "SESSION_REVOKED":
      return uniqueStrings([
        ...shared,
        event.payload.sessionId,
      ]);

    case "PROCESS_STARTED":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
        event.payload.accountId,
      ]);

    case "FILE_ACCESSED":
      return uniqueStrings([
        ...shared,
        event.payload.fileId,
        event.payload.deviceId,
        event.payload.accountId,
      ]);

    case "NETWORK_CONNECTION":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
      ]);

    case "ENDPOINT_HEARTBEAT":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
      ]);

    case "HOST_PROCESS_TERMINATED":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
        event.payload.accountId,
      ]);

    case "HOST_SERVICE_STATE_CHANGED":
    case "HOST_SERVICE_STARTUP_MODE_CHANGED":
    case "HOST_FILE_QUARANTINED":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
      ]);

    case "HOST_EVIDENCE_COLLECTED":
      return uniqueStrings([
        ...shared,
        event.payload.deviceId,
        ...event.payload.relatedEntityIds,
      ]);

    case "ALERT_CREATED":
      return uniqueStrings([
        ...shared,
        event.payload.alertId,
        event.payload.applicationId,
        ...event.payload.relatedEntityIds,
      ]);
  }
}

function getIndicators(
  event: SimulationEvent,
): readonly CaseIndicator[] {
  let ips: readonly string[] = [];

  switch (event.type) {
    case "AUTH_LOGIN_SUCCEEDED":
    case "AUTH_LOGIN_FAILED":
      ips = event.payload.sourceIp
        ? [event.payload.sourceIp]
        : [];
      break;

    case "NETWORK_CONNECTION":
      ips = [
        event.payload.sourceIp,
        event.payload.destinationIp,
      ];
      break;

    case "ENDPOINT_HEARTBEAT":
      ips = event.payload.ipAddresses;
      break;

    case "HOST_EVIDENCE_COLLECTED":
      ips = event.payload.indicatorIps;
      break;

    default:
      ips = [];
  }

  return uniqueStrings(ips).map(
    (value) => ({
      kind: "ip" as const,
      value,
    }),
  );
}

function getArtifactProvenance(
  event: SimulationEvent,
): CaseArtifactProvenance | undefined {
  if (event.type !== "HOST_EVIDENCE_COLLECTED") {
    return undefined;
  }

  const {
    artifactId,
    artifact,
    sourceInvocationId,
    acquisitionMethod,
    acquiredAt,
    sourceReference,
    integrity,
  } = event.payload;

  if (
    !artifactId ||
    !sourceInvocationId ||
    !acquisitionMethod ||
    !acquiredAt ||
    !sourceReference ||
    !integrity
  ) {
    return undefined;
  }

  return {
    artifactId,
    sourceInvocationId,
    acquisitionMethod,
    acquiredAt,
    sourceReference,
    integrity: structuredClone(integrity),
    sourceRefs:
      structuredClone(artifact?.sourceRefs ?? []),
    sourceRelationshipIds:
      artifact?.sourceRelationships.map(
        (relationship) => relationship.id,
      ) ?? [],
  };
}

export function buildCaseEvidenceRecords(
  state: AnalystCaseState,
  events: readonly SimulationEvent[],
): readonly CaseEvidenceRecord[] {
  const eventById = new Map(
    events.map((event) => [event.id, event]),
  );
  const siemById = new Map(
    rebuildProjection(
      siemProjection,
      events,
    ).events.map((record) => [
      record.eventId,
      record,
    ]),
  );

  return state.collectedEventIds.map(
    (eventId) => {
      const event = eventById.get(eventId);

      if (!event) {
        throw new Error(
          `Analyst evidence references unavailable event: ${eventId}`,
        );
      }

      const artifact =
        getArtifactProvenance(event);

      return {
        eventId,
        timestamp: event.timestamp,
        eventType: event.type,
        source: event.source,
        primaryTool:
          primaryToolForEvent(event.type),
        message:
          siemById.get(eventId)?.message ??
          event.type,
        relatedEntityIds:
          getKnownEntityIds(event),
        indicators: getIndicators(event),
        ...(artifact === undefined
          ? {}
          : { artifact }),
      };
    },
  );
}

export function buildCaseArtifactLineage(
  evidence: readonly CaseEvidenceRecord[],
): readonly CaseArtifactLineageLink[] {
  const artifacts = evidence.filter(
    (record): record is CaseEvidenceRecord & {
      artifact: CaseArtifactProvenance;
    } => record.artifact !== undefined,
  );
  const links: CaseArtifactLineageLink[] = [];

  for (
    let leftIndex = 0;
    leftIndex < artifacts.length;
    leftIndex += 1
  ) {
    const left = artifacts[leftIndex];
    const leftKeys = new Set(
      left.artifact.sourceRefs.map(
        syntheticHostObjectRefKey,
      ),
    );

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < artifacts.length;
      rightIndex += 1
    ) {
      const right = artifacts[rightIndex];
      const sharedSourceRefs =
        right.artifact.sourceRefs.filter(
          (ref) =>
            leftKeys.has(
              syntheticHostObjectRefKey(ref),
            ),
        );

      if (sharedSourceRefs.length === 0) {
        continue;
      }

      links.push({
        leftArtifactId:
          left.artifact.artifactId,
        rightArtifactId:
          right.artifact.artifactId,
        sharedSourceRefs:
          structuredClone(sharedSourceRefs),
      });
    }
  }

  return links;
}

export function buildCaseDecisionRecords(
  actions: readonly ScenarioAction[],
  performedActionIds: readonly EntityId[],
): readonly CaseDecisionRecord[] {
  const actionById = new Map(
    actions.map((action) => [
      action.id,
      action,
    ]),
  );

  return performedActionIds.map((actionId) => {
    const action = actionById.get(actionId);

    if (!action) {
      throw new Error(
        `Performed response action is unavailable: ${actionId}`,
      );
    }

    return {
      actionId,
      label: action.label,
      description: action.description,
      eventIds: action.events.map(
        (event) => event.id,
      ),
    };
  });
}

export function buildIncidentCaseReport(
  state: AnalystCaseState,
  actions: readonly ScenarioAction[],
  performedActionIds: readonly EntityId[],
  outcome: ScenarioOutcome,
): IncidentCaseReport {
  const decisions = buildCaseDecisionRecords(
    actions,
    performedActionIds,
  );
  const supportedHypothesisCount =
    state.hypotheses.filter(
      (hypothesis) =>
        hypothesis.status === "supported",
    ).length;
  const completedTaskCount =
    state.tasks.filter(
      (task) => task.status === "done",
    ).length;
  const openTaskCount =
    state.tasks.length - completedTaskCount;

  const summary = [
    `Case phase: ${state.phase}.`,
    `${state.collectedEventIds.length} evidence item(s), ${state.findings.length} finding(s), and ${state.hypotheses.length} hypothesis/hypotheses are recorded.`,
    `${openTaskCount} task(s) remain open; ${completedTaskCount} are complete.`,
    `${decisions.length} response decision(s) were performed.`,
    `Current run outcome: ${outcome.status}.`,
  ].join(" ");

  return {
    phase: state.phase,
    outcomeStatus: outcome.status,
    evidenceCount:
      state.collectedEventIds.length,
    findingCount: state.findings.length,
    hypothesisCount: state.hypotheses.length,
    supportedHypothesisCount,
    openTaskCount,
    completedTaskCount,
    decisionCount: decisions.length,
    summary,
  };
}
