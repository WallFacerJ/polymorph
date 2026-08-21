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
  it("derives exact host history from authoritative timestamps and canonical network tuples", () => {
    const scenario = compileScenarioDefinition(
      loadScenarioInput(),
    );
    const records =
      scenario.syntheticHostActivity?.[0]?.records ?? [];
    const ids = records.map((record) => record.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "derived:process:1020:started",
        "derived:process:4104:started",
        "derived:process:6172:started",
        "derived:process:8420:started",
        "derived:file:/Users/smartinez/Downloads/QuarterlyReview.docm:created",
        "derived:file:/Users/smartinez/AppData/Local/Temp/finance-update.ps1:modified",
        "derived:connection:range-connection-teams:opened:noise-network-fin-teams",
        "derived:connection:range-connection-powershell:opened:event-compromise-network",
      ]),
    );
    expect(
      scenario.syntheticHosts?.[0]?.capabilities,
    ).toContain("read:history");

    const teamsNetwork = records.find(
      (record) =>
        record.id ===
        "derived:connection:range-connection-teams:opened:noise-network-fin-teams",
    );
    const suspiciousNetwork = records.find(
      (record) =>
        record.id ===
        "derived:connection:range-connection-powershell:opened:event-compromise-network",
    );

    expect(teamsNetwork).toMatchObject({
      timestamp: "2026-08-20T14:53:20Z",
      type: "network_connection",
      connectionId: "range-connection-teams",
      processId: 4104,
    });
    expect(suspiciousNetwork).toMatchObject({
      timestamp: "2026-08-20T15:03:19Z",
      type: "network_connection",
      connectionId:
        "range-connection-powershell",
      processId: 8420,
    });
  });

  it("merges authored activity with derived history and sorts the result deterministically", () => {
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
              timestamp: "2026-08-20T15:03:20Z",
              type: "network_connection",
              connectionId:
                "range-connection-powershell",
              action: "opened",
              processId: 8420,
            },
            {
              id: "activity-process",
              timestamp: "2026-08-20T15:03:16Z",
              type: "process_started",
              processId: 8420,
            },
          ],
        },
      ],
    });
    const records =
      scenario.syntheticHostActivity?.[0]?.records ?? [];
    const authored = records.filter(
      (record) => record.id.startsWith("activity-"),
    );

    expect(authored.map((record) => record.id)).toEqual([
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
