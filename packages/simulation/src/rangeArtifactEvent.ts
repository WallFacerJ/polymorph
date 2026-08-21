import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import {
  summarizeRangeArtifact,
} from "./rangeArtifact";

import type {
  RangeArtifact,
} from "./rangeArtifact";

import type {
  HostEvidenceCollectedEvent,
} from "./simulationEvent";

export interface RangeArtifactEvidenceEventInput {
  id: EntityId;
  timestamp: SimulationTimestamp;
  actorId?: EntityId;
  artifact: RangeArtifact;
}

export function createRangeArtifactEvidenceEvent(
  input: RangeArtifactEvidenceEventInput,
): HostEvidenceCollectedEvent {
  const artifact = input.artifact;

  return {
    id: input.id,
    timestamp: input.timestamp,
    source: "range",
    ...(input.actorId === undefined
      ? {}
      : { actorId: input.actorId }),
    subjectId: artifact.deviceId,
    type: "HOST_EVIDENCE_COLLECTED",
    payload: {
      deviceId: artifact.deviceId,
      evidenceKind: artifact.kind,
      artifactId: artifact.id,
      artifact: structuredClone(artifact),
      sourceInvocationId: artifact.invocationId,
      acquisitionMethod:
        artifact.acquisitionMethod,
      acquiredAt: artifact.acquiredAt,
      sourceReference:
        artifact.sourceReference,
      integrity: structuredClone(
        artifact.integrity,
      ),
      targetId: artifact.sourceReference,
      summary: summarizeRangeArtifact(
        artifact,
      ),
      relatedEntityIds: [
        ...artifact.relatedEntityIds,
      ],
      indicatorIps: [
        ...artifact.indicatorIps,
      ],
    },
  };
}
