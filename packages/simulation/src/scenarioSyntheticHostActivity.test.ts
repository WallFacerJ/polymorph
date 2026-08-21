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
  compileScenarioDefinition,
} from "./scenarioCompiler";

const accountScenarioUrl = new URL(
  "../../../apps/web/public/scenarios/account-compromise.json",
  import.meta.url,
);

function loadScenarioInput() {
  return parseScenarioJson(
    readFileSync(
      accountScenarioUrl,
      "utf8",
    ),
  ).scenario;
}

describe("scenario synthetic host activity", () => {
  it("compiles and deterministically sorts authored activity beside host state", () => {
    const input = loadScenarioInput();
    const host = input.syntheticHosts[0];

    expect(host).toBeDefined();

    const scenario = compileScenarioDefinition({
      ...input,
      syntheticHosts: [
        {
          ...host!,
          activity: [
            {
              id: "activity-network",
              timestamp: "2026-08-20T15:03:19Z",
              type: "network_connection",
              connectionId:
                "range-connection-powershell",
              action: "opened",
              processId: 8420,
            },
            {
              id: "activity-process",
              timestamp: "2026-08-20T15:03:15Z",
              type: "process_started",
              processId: 8420,
            },
          ],
        },
      ],
    });

    expect(
      scenario.syntheticHostActivity?.[0]?.records.map(
        (record) => record.id,
      ),
    ).toEqual([
      "activity-process",
      "activity-network",
    ]);
  });

  it("rejects authored activity that references a missing host object", () => {
    const input = loadScenarioInput();
    const host = input.syntheticHosts[0];

    expect(host).toBeDefined();

    expect(() =>
      compileScenarioDefinition({
        ...input,
        syntheticHosts: [
          {
            ...host!,
            activity: [
              {
                id: "activity-missing-process",
                timestamp: "2026-08-20T15:03:15Z",
                type: "process_started",
                processId: 9999,
              },
            ],
          },
        ],
      }),
    ).toThrow(
      "Synthetic host activity activity-missing-process references missing process pid: 9999",
    );
  });
});
