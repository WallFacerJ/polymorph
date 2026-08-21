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

import type {
  SimulationEvent,
} from "./simulationEvent";

const events: readonly SimulationEvent[] = [
  {
    id: "event-login",
    type: "AUTH_LOGIN_SUCCEEDED",
    timestamp: "2026-08-20T12:00:00.000Z",
    source: "identity",
    payload: {
      accountId: "account-1",
      userId: "user-1",
      deviceId: "device-1",
      sourceIp: "198.51.100.42",
    },
  },
];

describe("incident command case state", () => {
  it("adds and resolves an evidence-backed hypothesis immutably", () => {
    const collected = collectAnalystEvidence(
      createAnalystCaseState(),
      "event-login",
      events,
    );

    const withHypothesis = addAnalystHypothesis(
      collected,
      {
        id: "hypothesis-1",
        title: " Compromised account ",
        summary: " Authentication source is inconsistent with expected activity. ",
        evidenceEventIds: ["event-login"],
      },
      events,
    );

    expect(collected.hypotheses).toEqual([]);
    expect(withHypothesis.hypotheses).toEqual([
      {
        id: "hypothesis-1",
        title: "Compromised account",
        summary: "Authentication source is inconsistent with expected activity.",
        status: "open",
        evidenceEventIds: ["event-login"],
      },
    ]);

    const supported = updateAnalystHypothesisStatus(
      withHypothesis,
      "hypothesis-1",
      "supported",
    );

    expect(supported.hypotheses[0].status)
      .toBe("supported");
    expect(withHypothesis.hypotheses[0].status)
      .toBe("open");
  });

  it("adds an owned evidence-backed task and tracks deterministic status", () => {
    const collected = collectAnalystEvidence(
      createAnalystCaseState(),
      "event-login",
      events,
    );

    const withTask = addAnalystTask(
      collected,
      {
        id: "task-1",
        title: " Validate source IP ",
        owner: " SOC analyst ",
        evidenceEventIds: ["event-login"],
      },
      events,
    );

    expect(withTask.tasks).toEqual([
      {
        id: "task-1",
        title: "Validate source IP",
        owner: "SOC analyst",
        status: "todo",
        evidenceEventIds: ["event-login"],
      },
    ]);

    const complete = updateAnalystTaskStatus(
      withTask,
      "task-1",
      "done",
    );

    expect(complete.tasks[0].status).toBe("done");
  });

  it("tracks explicit incident phase without changing other case state", () => {
    const initial = createAnalystCaseState();
    const containment = setAnalystCasePhase(
      initial,
      "containment",
    );

    expect(initial.phase).toBe("investigation");
    expect(containment.phase).toBe("containment");
    expect(containment.collectedEventIds).toBe(
      initial.collectedEventIds,
    );
  });

  it("rejects hypothesis and task evidence that was not collected", () => {
    const initial = createAnalystCaseState();

    expect(() =>
      addAnalystHypothesis(
        initial,
        {
          id: "hypothesis-1",
          title: "Compromise",
          summary: "Needs evidence.",
          evidenceEventIds: ["event-login"],
        },
        events,
      ),
    ).toThrow(
      "Analyst hypothesis references uncollected evidence event: event-login",
    );

    expect(() =>
      addAnalystTask(
        initial,
        {
          id: "task-1",
          title: "Validate",
          owner: "analyst",
          evidenceEventIds: ["event-login"],
        },
        events,
      ),
    ).toThrow(
      "Analyst task references uncollected evidence event: event-login",
    );
  });
});
