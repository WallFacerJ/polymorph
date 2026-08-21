import {
  describe,
  expect,
  it,
} from "vitest";

import {
  addAnalystHypothesis,
  addAnalystTask,
  collectAnalystEvidence,
  createAnalystCaseState,
  setAnalystCasePhase,
  updateAnalystHypothesisStatus,
  updateAnalystTaskStatus,
} from "./analystCase";

import {
  buildCaseDecisionRecords,
  buildCaseEvidenceRecords,
  buildIncidentCaseReport,
} from "./incidentCase";

import type {
  ScenarioAction,
} from "./scenario";

import type {
  ScenarioOutcome,
} from "./scenarioOutcome";

import type {
  SimulationEvent,
} from "./simulationEvent";

const events: readonly SimulationEvent[] = [
  {
    id: "event-login",
    type: "AUTH_LOGIN_SUCCEEDED",
    timestamp: "2026-08-20T12:00:00.000Z",
    source: "identity",
    actorId: "account-1",
    subjectId: "user-1",
    payload: {
      accountId: "account-1",
      userId: "user-1",
      deviceId: "device-1",
      applicationId: "app-idp",
      sourceIp: "198.51.100.42",
    },
  },
  {
    id: "event-network",
    type: "NETWORK_CONNECTION",
    timestamp: "2026-08-20T12:01:00.000Z",
    source: "edr",
    actorId: "account-1",
    subjectId: "device-1",
    payload: {
      deviceId: "device-1",
      protocol: "tcp",
      sourceIp: "10.0.0.5",
      destinationIp: "203.0.113.77",
      destinationPort: 443,
    },
  },
];

const actions: readonly ScenarioAction[] = [
  {
    id: "revoke-session",
    label: "Revoke session",
    description: "Terminate the compromised session.",
    events: [
      {
        id: "event-revoked",
        type: "SESSION_REVOKED",
        timestamp: "2026-08-20T12:02:00.000Z",
        source: "identity",
        payload: {
          sessionId: "session-1",
          reason: "Analyst containment",
        },
      },
    ],
  },
];

const outcome: ScenarioOutcome = {
  status: "in_progress",
  objectives: [],
};

describe("incident command case derivation", () => {
  it("resolves collected evidence with source-tool provenance entities and indicators", () => {
    const state = collectAnalystEvidence(
      collectAnalystEvidence(
        createAnalystCaseState(),
        "event-login",
        events,
      ),
      "event-network",
      events,
    );

    expect(buildCaseEvidenceRecords(state, events))
      .toEqual([
        {
          eventId: "event-login",
          timestamp: "2026-08-20T12:00:00.000Z",
          eventType: "AUTH_LOGIN_SUCCEEDED",
          source: "identity",
          primaryTool: "identity",
          message: "Login succeeded for account account-1",
          relatedEntityIds: [
            "account-1",
            "user-1",
            "device-1",
            "app-idp",
          ],
          indicators: [
            {
              kind: "ip",
              value: "198.51.100.42",
            },
          ],
        },
        {
          eventId: "event-network",
          timestamp: "2026-08-20T12:01:00.000Z",
          eventType: "NETWORK_CONNECTION",
          source: "edr",
          primaryTool: "edr",
          message: "Network connection 10.0.0.5 -> 203.0.113.77",
          relatedEntityIds: [
            "account-1",
            "device-1",
          ],
          indicators: [
            {
              kind: "ip",
              value: "10.0.0.5",
            },
            {
              kind: "ip",
              value: "203.0.113.77",
            },
          ],
        },
      ]);
  });

  it("derives performed response decisions from canonical scenario actions", () => {
    expect(
      buildCaseDecisionRecords(
        actions,
        ["revoke-session"],
      ),
    ).toEqual([
      {
        actionId: "revoke-session",
        label: "Revoke session",
        description: "Terminate the compromised session.",
        eventIds: ["event-revoked"],
      },
    ]);
  });

  it("builds a deterministic compact report from actual case and run state", () => {
    let state = collectAnalystEvidence(
      createAnalystCaseState(),
      "event-login",
      events,
    );
    state = addAnalystHypothesis(
      state,
      {
        id: "hypothesis-1",
        title: "Compromised identity",
        summary: "The login source is suspicious.",
        evidenceEventIds: ["event-login"],
      },
      events,
    );
    state = updateAnalystHypothesisStatus(
      state,
      "hypothesis-1",
      "supported",
    );
    state = addAnalystTask(
      state,
      {
        id: "task-1",
        title: "Validate identity",
        owner: "SOC",
        evidenceEventIds: ["event-login"],
      },
      events,
    );
    state = updateAnalystTaskStatus(
      state,
      "task-1",
      "done",
    );
    state = setAnalystCasePhase(
      state,
      "containment",
    );

    const report = buildIncidentCaseReport(
      state,
      actions,
      ["revoke-session"],
      outcome,
    );

    expect(report).toMatchObject({
      phase: "containment",
      outcomeStatus: "in_progress",
      evidenceCount: 1,
      hypothesisCount: 1,
      supportedHypothesisCount: 1,
      openTaskCount: 0,
      completedTaskCount: 1,
      decisionCount: 1,
    });
    expect(report.summary).toContain(
      "Case phase: containment.",
    );
    expect(report.summary).toContain(
      "Current run outcome: in_progress.",
    );
  });
});
