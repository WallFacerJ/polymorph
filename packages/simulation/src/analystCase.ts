import type {
  EntityId,
} from "@polymorph/domain";

import type {
  SimulationEvent,
} from "./simulationEvent";

export type AnalystCasePhase =
  | "investigation"
  | "containment"
  | "recovery"
  | "closed";

export type AnalystHypothesisStatus =
  | "open"
  | "supported"
  | "rejected";

export type AnalystTaskStatus =
  | "todo"
  | "in_progress"
  | "done";

export interface AnalystFinding {
  id: EntityId;
  title: string;
  summary: string;
  evidenceEventIds: readonly EntityId[];
}

export interface AnalystHypothesis {
  id: EntityId;
  title: string;
  summary: string;
  status: AnalystHypothesisStatus;
  evidenceEventIds: readonly EntityId[];
}

export interface AnalystTask {
  id: EntityId;
  title: string;
  owner: string;
  status: AnalystTaskStatus;
  evidenceEventIds: readonly EntityId[];
}

export interface AnalystCaseState {
  collectedEventIds: readonly EntityId[];
  findings: readonly AnalystFinding[];
  hypotheses: readonly AnalystHypothesis[];
  tasks: readonly AnalystTask[];
  phase: AnalystCasePhase;
}

export interface AnalystFindingInput {
  id: EntityId;
  title: string;
  summary: string;
  evidenceEventIds: readonly EntityId[];
}

export interface AnalystHypothesisInput {
  id: EntityId;
  title: string;
  summary: string;
  evidenceEventIds: readonly EntityId[];
}

export interface AnalystTaskInput {
  id: EntityId;
  title: string;
  owner: string;
  evidenceEventIds: readonly EntityId[];
}

export function createAnalystCaseState():
  AnalystCaseState {
  return {
    collectedEventIds: [],
    findings: [],
    hypotheses: [],
    tasks: [],
    phase: "investigation",
  };
}

function requireAvailableEvent(
  eventId: EntityId,
  availableEvents: readonly SimulationEvent[],
): void {
  if (
    availableEvents.some(
      (event) => event.id === eventId,
    )
  ) {
    return;
  }

  throw new Error(
    `Analyst evidence references unavailable event: ${eventId}`,
  );
}

export function collectAnalystEvidence(
  state: AnalystCaseState,
  eventId: EntityId,
  availableEvents: readonly SimulationEvent[],
): AnalystCaseState {
  requireAvailableEvent(
    eventId,
    availableEvents,
  );

  if (
    state.collectedEventIds.includes(
      eventId,
    )
  ) {
    return state;
  }

  return {
    ...state,
    collectedEventIds: [
      ...state.collectedEventIds,
      eventId,
    ],
  };
}

function requireText(
  value: string,
  errorPrefix: string,
  field: string,
): string {
  const trimmed = value.trim();

  if (trimmed.length > 0) {
    return trimmed;
  }

  throw new Error(
    `${errorPrefix} ${field} must not be empty.`,
  );
}

function requireCollectedEvidence(
  state: AnalystCaseState,
  evidenceEventIds: readonly EntityId[],
  availableEvents: readonly SimulationEvent[],
  label: string,
): readonly EntityId[] {
  if (evidenceEventIds.length === 0) {
    throw new Error(
      `${label} must reference at least one collected evidence event.`,
    );
  }

  const unique = new Set<EntityId>();

  for (const eventId of evidenceEventIds) {
    if (unique.has(eventId)) {
      throw new Error(
        `${label} references duplicate evidence event: ${eventId}`,
      );
    }

    unique.add(eventId);
    requireAvailableEvent(
      eventId,
      availableEvents,
    );

    if (
      !state.collectedEventIds.includes(
        eventId,
      )
    ) {
      throw new Error(
        `${label} references uncollected evidence event: ${eventId}`,
      );
    }
  }

  return [...unique];
}

export function addAnalystFinding(
  state: AnalystCaseState,
  input: AnalystFindingInput,
  availableEvents: readonly SimulationEvent[],
): AnalystCaseState {
  if (
    state.findings.some(
      (finding) => finding.id === input.id,
    )
  ) {
    throw new Error(
      `Analyst finding id already exists: ${input.id}`,
    );
  }

  const finding: AnalystFinding = {
    id: input.id,
    title: requireText(
      input.title,
      "Analyst finding",
      "title",
    ),
    summary: requireText(
      input.summary,
      "Analyst finding",
      "summary",
    ),
    evidenceEventIds:
      requireCollectedEvidence(
        state,
        input.evidenceEventIds,
        availableEvents,
        "Analyst finding",
      ),
  };

  return {
    ...state,
    findings: [
      ...state.findings,
      finding,
    ],
  };
}

export function addAnalystHypothesis(
  state: AnalystCaseState,
  input: AnalystHypothesisInput,
  availableEvents: readonly SimulationEvent[],
): AnalystCaseState {
  if (
    state.hypotheses.some(
      (hypothesis) => hypothesis.id === input.id,
    )
  ) {
    throw new Error(
      `Analyst hypothesis id already exists: ${input.id}`,
    );
  }

  const hypothesis: AnalystHypothesis = {
    id: input.id,
    title: requireText(
      input.title,
      "Analyst hypothesis",
      "title",
    ),
    summary: requireText(
      input.summary,
      "Analyst hypothesis",
      "summary",
    ),
    status: "open",
    evidenceEventIds:
      requireCollectedEvidence(
        state,
        input.evidenceEventIds,
        availableEvents,
        "Analyst hypothesis",
      ),
  };

  return {
    ...state,
    hypotheses: [
      ...state.hypotheses,
      hypothesis,
    ],
  };
}

export function updateAnalystHypothesisStatus(
  state: AnalystCaseState,
  hypothesisId: EntityId,
  status: AnalystHypothesisStatus,
): AnalystCaseState {
  const index = state.hypotheses.findIndex(
    (hypothesis) =>
      hypothesis.id === hypothesisId,
  );

  if (index < 0) {
    throw new Error(
      `Unknown analyst hypothesis: ${hypothesisId}`,
    );
  }

  const current = state.hypotheses[index];

  if (current.status === status) {
    return state;
  }

  const hypotheses = [...state.hypotheses];
  hypotheses[index] = {
    ...current,
    status,
  };

  return {
    ...state,
    hypotheses,
  };
}

export function addAnalystTask(
  state: AnalystCaseState,
  input: AnalystTaskInput,
  availableEvents: readonly SimulationEvent[],
): AnalystCaseState {
  if (
    state.tasks.some(
      (task) => task.id === input.id,
    )
  ) {
    throw new Error(
      `Analyst task id already exists: ${input.id}`,
    );
  }

  const task: AnalystTask = {
    id: input.id,
    title: requireText(
      input.title,
      "Analyst task",
      "title",
    ),
    owner: requireText(
      input.owner,
      "Analyst task",
      "owner",
    ),
    status: "todo",
    evidenceEventIds:
      requireCollectedEvidence(
        state,
        input.evidenceEventIds,
        availableEvents,
        "Analyst task",
      ),
  };

  return {
    ...state,
    tasks: [
      ...state.tasks,
      task,
    ],
  };
}

export function updateAnalystTaskStatus(
  state: AnalystCaseState,
  taskId: EntityId,
  status: AnalystTaskStatus,
): AnalystCaseState {
  const index = state.tasks.findIndex(
    (task) => task.id === taskId,
  );

  if (index < 0) {
    throw new Error(
      `Unknown analyst task: ${taskId}`,
    );
  }

  const current = state.tasks[index];

  if (current.status === status) {
    return state;
  }

  const tasks = [...state.tasks];
  tasks[index] = {
    ...current,
    status,
  };

  return {
    ...state,
    tasks,
  };
}

export function setAnalystCasePhase(
  state: AnalystCaseState,
  phase: AnalystCasePhase,
): AnalystCaseState {
  if (state.phase === phase) {
    return state;
  }

  return {
    ...state,
    phase,
  };
}

export function resolveCollectedEvidence(
  state: AnalystCaseState,
  availableEvents: readonly SimulationEvent[],
): readonly SimulationEvent[] {
  const eventById = new Map(
    availableEvents.map(
      (event) => [event.id, event],
    ),
  );

  return state.collectedEventIds.map(
    (eventId) => {
      const event = eventById.get(eventId);

      if (!event) {
        throw new Error(
          `Analyst evidence references unavailable event: ${eventId}`,
        );
      }

      return event;
    },
  );
}
