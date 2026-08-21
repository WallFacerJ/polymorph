import {
  createRangeArtifact as buildRangeArtifact,
  createRangeArtifactEvidenceEvent as buildRangeArtifactEvidenceEvent,
} from "@polymorph/simulation";

import type {
  SyntheticHostCommandExecution as RangeHostExecution,
  SyntheticHostCommandInvocation as RangeHostInvocation,
} from "@polymorph/simulation";

export {
  addAnalystFinding,
  addAnalystHypothesis,
  addAnalystTask,
  buildCaseDecisionRecords,
  buildCaseEvidenceRecords,
  buildIncidentCaseReport,
  collectAnalystEvidence,
  compileScenarioDefinition,
  createAnalystCaseState,
  createRangeArtifact,
  createRangeArtifactEvidenceEvent,
  edrHostActivityProjection,
  edrProjection,
  executeSyntheticHostCommand,
  finalizeScenarioState,
  getEdrEndpointInvestigation,
  getEdrHostActivityForDevice,
  getIdentityAccountInvestigation,
  getIdentityInventory,
  getObservedEdrDeviceIds,
  getScenarioState,
  identityProjection,
  mergeSimulationEventHistory,
  rebuildProjection,
  replayRangeCommandsWithEvents,
  replaySyntheticHostCommands,
  resolveCollectedEvidence,
  searchSiem,
  setAnalystCasePhase,
  siemProjection,
  updateAnalystHypothesisStatus,
  updateAnalystTaskStatus,
} from "@polymorph/simulation";

export type {
  AnalystCasePhase,
  AnalystCaseState,
  AnalystHypothesisStatus,
  AnalystTaskStatus,
  CaseArtifactProvenance,
  CaseDecisionRecord,
  CaseEvidenceRecord,
  EdrEndpointInvestigation,
  EdrHostActivityObservation,
  EdrHostActivityProjectionState,
  EdrProcessTreeNode,
  EdrProjectionState,
  IdentityAccountInvestigation,
  IdentityInventoryEntry,
  IdentityProjectionState,
  IncidentCaseReport,
  RangeArtifact,
  RangeArtifactIntegrity,
  ScenarioAction,
  ScenarioDefinition,
  ScenarioOutcome,
  ScenarioOutcomeStatus,
  ScenarioScore,
  ScenarioState,
  SiemEventRecord,
  SiemSearchRequest,
  SiemSearchResult,
  SimulationEvent,
  SyntheticHostCommand,
  SyntheticHostCommandExecution,
  SyntheticHostCommandInvocation,
  SyntheticHostState,
} from "@polymorph/simulation";

interface RangeEvidenceAcquisitionInput {
  id: string;
  timestamp: string;
  deviceId: string;
  actorId?: string;
  invocation: RangeHostInvocation;
  execution: RangeHostExecution;
}

export function createRangeEvidenceEvent(
  input: RangeEvidenceAcquisitionInput,
) {
  const artifact = buildRangeArtifact({
    id: `${input.invocation.id}-artifact`,
    acquiredAt: input.timestamp,
    deviceId: input.deviceId,
    invocation: input.invocation,
    execution: input.execution,
  });

  return buildRangeArtifactEvidenceEvent({
    id: input.id,
    timestamp: input.timestamp,
    ...(input.actorId === undefined
      ? {}
      : { actorId: input.actorId }),
    artifact,
  });
}
