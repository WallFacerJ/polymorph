import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createRangeArtifact,
} from "./rangeArtifact";

import {
  replayRangeCommandsWithEvents,
} from "./rangeEventBridge";

import {
  createSyntheticHostState,
} from "./syntheticHost";

import type {
  SyntheticHostActivity,
} from "./syntheticHostActivity";

const host = createSyntheticHostState({
  deviceId: "device-fin-lt-04",
  capabilities: [
    "read:history",
    "terminate:process",
  ],
  processes: [
    {
      pid: 8420,
      image: "powershell.exe",
      commandLine:
        "powershell.exe -File finance-update.ps1",
      state: "running",
      startedAt: "2026-08-20T15:03:15Z",
    },
    {
      pid: 7300,
      image: "powershell.exe",
      commandLine:
        "powershell.exe Get-Service AcmeBackupAgent",
      state: "terminated",
      startedAt: "2026-08-20T14:56:00Z",
      terminatedAt: "2026-08-20T14:56:05Z",
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
      {
        id: "range-connection-admin-powershell",
        protocol: "tcp",
        localAddress: "10.20.30.44",
        localPort: 49680,
        remoteAddress: "10.20.40.15",
        remotePort: 5985,
        state: "closed",
        processId: 7300,
      },
    ],
  },
});

const activity:
  readonly SyntheticHostActivity[] = [
    {
      id: "activity-admin-start",
      timestamp: "2026-08-20T14:56:00Z",
      type: "process_started",
      processId: 7300,
    },
    {
      id: "activity-admin-network",
      timestamp: "2026-08-20T14:56:02Z",
      type: "network_connection",
      connectionId:
        "range-connection-admin-powershell",
      action: "opened",
      processId: 7300,
    },
    {
      id: "activity-admin-stop",
      timestamp: "2026-08-20T14:56:05Z",
      type: "process_terminated",
      processId: 7300,
    },
    {
      id: "activity-suspicious-start",
      timestamp: "2026-08-20T15:03:15Z",
      type: "process_started",
      processId: 8420,
    },
    {
      id: "activity-suspicious-network",
      timestamp: "2026-08-20T15:03:19Z",
      type: "network_connection",
      connectionId:
        "range-connection-powershell",
      action: "opened",
      processId: 8420,
    },
  ];

describe("Range host-history acquisition", () => {
  it("acquires a filtered immutable history artifact with source refs, bounds, and indicators", () => {
    const invocation = {
      id: "range-command-history",
      timestamp: "2026-08-21T07:00:01.000Z",
      command: {
        type: "list_activity" as const,
        objectKind: "process" as const,
        objectId: "8420",
      },
    };
    const replay = replayRangeCommandsWithEvents(
      host,
      [invocation],
      activity,
    );
    const execution = replay.executions[0];

    expect(execution).toBeDefined();

    const artifact = createRangeArtifact({
      id: "range-command-history-artifact",
      acquiredAt: "2026-08-21T07:00:01.001Z",
      deviceId: host.deviceId,
      invocation,
      execution: execution!,
    });

    expect(artifact.kind).toBe("history");
    expect(artifact.sourceReference).toBe(
      "history:process:8420",
    );
    expect(artifact.sourceRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "process",
          id: "8420",
        },
        {
          kind: "connection",
          id: "range-connection-powershell",
        },
      ]),
    );
    expect(artifact.indicatorIps).toContain(
      "203.0.113.77",
    );

    if (artifact.kind !== "history") {
      throw new Error("Expected history artifact.");
    }

    expect(artifact.snapshot).toMatchObject({
      filter: {
        kind: "process",
        id: "8420",
      },
      startAt: "2026-08-20T15:03:15Z",
      endAt: "2026-08-20T15:03:19Z",
    });
    expect(
      artifact.snapshot.records.map(
        (record) => record.id,
      ),
    ).toEqual([
      "activity-suspicious-start",
      "activity-suspicious-network",
    ]);
  });

  it("keeps authored history unchanged when containment closes current network state", () => {
    const beforeInvocation = {
      id: "range-command-history-before",
      timestamp: "2026-08-21T07:00:01.000Z",
      command: {
        type: "list_activity" as const,
        objectKind: "process" as const,
        objectId: "8420",
      },
    };
    const killInvocation = {
      id: "range-command-kill",
      timestamp: "2026-08-21T07:00:02.000Z",
      command: {
        type: "terminate_process" as const,
        pid: 8420,
      },
    };
    const afterInvocation = {
      id: "range-command-history-after",
      timestamp: "2026-08-21T07:00:03.000Z",
      command: {
        type: "list_activity" as const,
        objectKind: "process" as const,
        objectId: "8420",
      },
    };

    const replay = replayRangeCommandsWithEvents(
      host,
      [
        beforeInvocation,
        killInvocation,
        afterInvocation,
      ],
      activity,
    );
    const before = replay.executions[0]?.result;
    const after = replay.executions[2]?.result;

    expect(before?.kind).toBe("activity");
    expect(after?.kind).toBe("activity");

    if (
      before?.kind !== "activity" ||
      after?.kind !== "activity"
    ) {
      throw new Error(
        "Expected history executions before and after containment.",
      );
    }

    expect(after.records).toEqual(before.records);
    expect(
      replay.state.network.connections.find(
        (connection) =>
          connection.id ===
          "range-connection-powershell",
      )?.state,
    ).toBe("closed");
    expect(
      replay.state.processes.find(
        (process) => process.pid === 8420,
      )?.state,
    ).toBe("terminated");
  });

  it("keeps benign PowerShell history distinct from the suspicious process filter", () => {
    const replay = replayRangeCommandsWithEvents(
      host,
      [
        {
          id: "range-command-benign-history",
          timestamp: "2026-08-21T07:00:01.000Z",
          command: {
            type: "list_activity",
            objectKind: "process",
            objectId: "7300",
          },
        },
      ],
      activity,
    );
    const result = replay.executions[0]?.result;

    expect(result?.kind).toBe("activity");

    if (result?.kind !== "activity") {
      throw new Error("Expected activity result.");
    }

    expect(
      result.records.map((record) => record.id),
    ).toEqual([
      "activity-admin-start",
      "activity-admin-network",
      "activity-admin-stop",
    ]);
    expect(
      result.records.some((record) =>
        record.id.includes("suspicious"),
      ),
    ).toBe(false);
  });
});
