import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseScenarioJson,
} from "../../schema/src/scenario";

import {
  collectAnalystEvidence,
  createAnalystCaseState,
} from "./analystCase";

import {
  edrHostActivityProjection,
} from "./edrHostActivityProjection";

import {
  buildCaseEvidenceRecords,
} from "./incidentCase";

import {
  rebuildProjection,
} from "./projection";

import {
  createRangeEvidenceEvent,
  mergeSimulationEventHistory,
  replayRangeCommandsWithEvents,
} from "./rangeEventBridge";

import {
  getScenarioState,
} from "./scenario";

import {
  compileScenarioDefinition,
} from "./scenarioCompiler";

import {
  siemProjection,
} from "./siemProjection";

import type {
  SyntheticHostCommandInvocation,
} from "./syntheticHost";

const scenarioUrl = new URL(
  "../../../apps/web/public/scenarios/account-compromise.json",
  import.meta.url,
);

function loadScenario() {
  const file = parseScenarioJson(
    readFileSync(scenarioUrl, "utf8"),
  );

  return compileScenarioDefinition(
    file.scenario,
  );
}

function invocation(
  id: string,
  timestamp: string,
  command: SyntheticHostCommandInvocation["command"],
): SyntheticHostCommandInvocation {
  return {
    id,
    timestamp,
    actorId: "analyst-range",
    command,
  };
}

describe("Range canonical event bridge", () => {
  it("replays host containment deterministically and closes process-owned network state", () => {
    const scenario = loadScenario();
    const host = scenario.syntheticHosts?.[0];

    expect(host).toBeDefined();

    const invocations = [
      invocation(
        "range-command-net",
        "2026-08-20T15:03:26.000Z",
        { type: "list_network" },
      ),
      invocation(
        "range-command-kill",
        "2026-08-20T15:03:27.000Z",
        {
          type: "terminate_process",
          pid: 8420,
        },
      ),
    ];

    const first = replayRangeCommandsWithEvents(
      host!,
      invocations,
    );
    const second = replayRangeCommandsWithEvents(
      host!,
      invocations,
    );

    expect(second).toEqual(first);
    expect(
      first.state.processes.find(
        (process) => process.pid === 8420,
      )?.state,
    ).toBe("terminated");
    expect(
      first.state.network.connections.find(
        (connection) =>
          connection.id ===
          "range-connection-powershell",
      )?.state,
    ).toBe("closed");

    expect(first.events).toEqual([
      expect.objectContaining({
        id: "range-command-kill-event",
        type: "HOST_PROCESS_TERMINATED",
        source: "range",
        payload: expect.objectContaining({
          deviceId: "device-fin-lt-04",
          processId: "8420",
          closedConnectionIds: [
            "range-connection-powershell",
          ],
        }),
      }),
    ]);

    const history = mergeSimulationEventHistory(
      getScenarioState(scenario).events,
      first.events,
    );
    const siem = rebuildProjection(
      siemProjection,
      history,
    );
    const edrHost = rebuildProjection(
      edrHostActivityProjection,
      history,
    );

    expect(
      siem.events.some(
        (event) =>
          event.eventId ===
          "range-command-kill-event" &&
          event.family === "host",
      ),
    ).toBe(true);
    expect(edrHost.observations).toEqual([
      expect.objectContaining({
        deviceId: "device-fin-lt-04",
        targetId: "8420",
        eventType:
          "HOST_PROCESS_TERMINATED",
      }),
    ]);
  });

  it("promotes an explicit Range observation into Case evidence with provenance and indicators", () => {
    const scenario = loadScenario();
    const host = scenario.syntheticHosts?.[0];

    expect(host).toBeDefined();

    const readNetwork = invocation(
      "range-command-network-evidence",
      "2026-08-20T15:03:26.000Z",
      { type: "list_network" },
    );
    const replay = replayRangeCommandsWithEvents(
      host!,
      [readNetwork],
    );
    const evidenceEvent = createRangeEvidenceEvent({
      id: "range-evidence-1",
      timestamp:
        "2026-08-20T15:03:26.500Z",
      deviceId: host!.deviceId,
      actorId: "analyst-range",
      invocation: readNetwork,
      execution: replay.executions[0],
    });
    const history = mergeSimulationEventHistory(
      getScenarioState(scenario).events,
      [evidenceEvent],
    );
    const caseState = collectAnalystEvidence(
      createAnalystCaseState(),
      evidenceEvent.id,
      history,
    );
    const records = buildCaseEvidenceRecords(
      caseState,
      history,
    );

    expect(records).toEqual([
      expect.objectContaining({
        eventId: "range-evidence-1",
        eventType:
          "HOST_EVIDENCE_COLLECTED",
        primaryTool: "range",
        relatedEntityIds:
          expect.arrayContaining([
            "device-fin-lt-04",
          ]),
        indicators:
          expect.arrayContaining([
            {
              kind: "ip",
              value: "203.0.113.77",
            },
          ]),
      }),
    ]);
  });

  it("does not create duplicate evidence events from mutation results", () => {
    const scenario = loadScenario();
    const host = scenario.syntheticHosts?.[0];
    expect(host).toBeDefined();

    const kill = invocation(
      "range-command-kill-evidence",
      "2026-08-20T15:03:27.000Z",
      {
        type: "terminate_process",
        pid: 8420,
      },
    );
    const replay = replayRangeCommandsWithEvents(
      host!,
      [kill],
    );

    expect(() =>
      createRangeEvidenceEvent({
        id: "range-evidence-duplicate",
        timestamp:
          "2026-08-20T15:03:27.500Z",
        deviceId: host!.deviceId,
        invocation: kill,
        execution: replay.executions[0],
      }),
    ).toThrow(
      "Range mutation results are already recorded as canonical host-action events",
    );
  });
});
