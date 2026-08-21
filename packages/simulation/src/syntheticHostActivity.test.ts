import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSyntheticHostState,
} from "./syntheticHost";

import {
  getSyntheticHostActivityRefs,
  getSyntheticHostActivityTimeRange,
  querySyntheticHostActivity,
  validateSyntheticHostActivity,
} from "./syntheticHostActivity";

import type {
  SyntheticHostActivity,
} from "./syntheticHostActivity";

const scriptPath =
  "/Users/smartinez/AppData/Local/Temp/finance-update.ps1";

function createHost() {
  return createSyntheticHostState({
    deviceId: "device-fin-lt-04",
    files: [
      {
        path: scriptPath,
        content: "synthetic",
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
    services: [
      {
        name: "AcmeBackupAgent",
        executable: "/Program Files/Acme/backup-agent.exe",
        startupMode: "automatic",
        status: "running",
      },
    ],
    configuration: {
      "HKLM/System/CurrentControlSet/Services/AcmeBackupAgent/Start": 2,
    },
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
}

const activity: readonly SyntheticHostActivity[] = [
  {
    id: "activity-process",
    timestamp: "2026-08-20T15:03:15Z",
    type: "process_started",
    processId: 8420,
  },
  {
    id: "activity-file",
    timestamp: "2026-08-20T15:03:18Z",
    type: "file_activity",
    filePath: scriptPath,
    operation: "execute",
    processId: 8420,
  },
  {
    id: "activity-network",
    timestamp: "2026-08-20T15:03:19Z",
    type: "network_connection",
    connectionId: "range-connection-powershell",
    action: "opened",
    processId: 8420,
  },
  {
    id: "activity-service-startup",
    timestamp: "2026-08-20T15:04:00Z",
    type: "service_startup_mode",
    serviceName: "AcmeBackupAgent",
    previousStartupMode: "manual",
    startupMode: "automatic",
  },
];

describe("synthetic host activity history", () => {
  it("sorts deterministically and filters by shared object references", () => {
    const reversed = [...activity].reverse();
    const result = querySyntheticHostActivity(
      reversed,
      {
        ref: {
          kind: "process",
          id: "8420",
        },
      },
    );

    expect(result.map((record) => record.id)).toEqual([
      "activity-process",
      "activity-file",
      "activity-network",
    ]);
    expect(getSyntheticHostActivityTimeRange(result)).toEqual({
      startAt: "2026-08-20T15:03:15Z",
      endAt: "2026-08-20T15:03:19Z",
    });
  });

  it("orders mixed timestamp precision by instant rather than source text", () => {
    const result = querySyntheticHostActivity([
      {
        id: "fractional-later",
        timestamp: "2026-08-20T15:04:00.250Z",
        type: "service_state",
        serviceName: "AcmeBackupAgent",
        status: "running",
      },
      {
        id: "whole-second-earlier",
        timestamp: "2026-08-20T15:04:00Z",
        type: "service_startup_mode",
        serviceName: "AcmeBackupAgent",
        previousStartupMode: "manual",
        startupMode: "automatic",
      },
    ]);

    expect(result.map((record) => record.id)).toEqual([
      "whole-second-earlier",
      "fractional-later",
    ]);
  });

  it("exposes exact source refs without inferring extra causality", () => {
    expect(
      getSyntheticHostActivityRefs(activity[1]),
    ).toEqual([
      {
        kind: "file",
        id: scriptPath,
      },
      {
        kind: "process",
        id: "8420",
      },
    ]);

    expect(
      getSyntheticHostActivityRefs(activity[3]),
    ).toEqual([
      {
        kind: "service",
        id: "AcmeBackupAgent",
      },
    ]);
  });

  it("filters service startup-mode history independently from service current state", () => {
    const result = querySyntheticHostActivity(
      activity,
      {
        ref: {
          kind: "service",
          id: "AcmeBackupAgent",
        },
      },
    );

    expect(result).toEqual([
      activity[3],
    ]);
  });

  it("rejects missing endpoints and ownership contradictions", () => {
    const host = createHost();

    expect(() =>
      validateSyntheticHostActivity(
        host,
        [
          {
            id: "missing-file",
            timestamp: "2026-08-20T15:03:18Z",
            type: "file_activity",
            filePath: "/missing.ps1",
            operation: "execute",
          },
        ],
      ),
    ).toThrow(
      "Synthetic host activity missing-file references missing file: /missing.ps1",
    );

    expect(() =>
      validateSyntheticHostActivity(
        host,
        [
          {
            id: "wrong-owner",
            timestamp: "2026-08-20T15:03:19Z",
            type: "network_connection",
            connectionId: "range-connection-powershell",
            action: "opened",
            processId: 9999,
          },
        ],
      ),
    ).toThrow(
      "Synthetic host activity wrong-owner references missing process pid: 9999",
    );

    expect(() =>
      validateSyntheticHostActivity(
        host,
        [
          {
            id: "missing-service",
            timestamp: "2026-08-20T15:04:00Z",
            type: "service_startup_mode",
            serviceName: "MissingAgent",
            previousStartupMode: "manual",
            startupMode: "automatic",
          },
        ],
      ),
    ).toThrow(
      "Synthetic host activity missing-service references missing service: MissingAgent",
    );
  });

  it("rejects startup-mode history that does not actually change mode", () => {
    expect(() =>
      validateSyntheticHostActivity(
        createHost(),
        [
          {
            id: "unchanged-startup-mode",
            timestamp: "2026-08-20T15:04:00Z",
            type: "service_startup_mode",
            serviceName: "AcmeBackupAgent",
            previousStartupMode: "automatic",
            startupMode: "automatic",
          },
        ],
      ),
    ).toThrow(
      "Synthetic host activity unchanged-startup-mode service startup mode must change.",
    );
  });

  it("rejects duplicate activity ids", () => {
    expect(() =>
      validateSyntheticHostActivity(
        createHost(),
        [activity[0], activity[0]],
      ),
    ).toThrow(
      "Synthetic host activity contains duplicate id: activity-process",
    );
  });
});
