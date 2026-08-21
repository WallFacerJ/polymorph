import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createWorldState,
} from "./worldState";

import {
  createSyntheticHostState,
  deserializeSyntheticHostState,
  executeSyntheticHostCommand,
  replaySyntheticHostCommands,
  resetSyntheticHostState,
  serializeSyntheticHostState,
} from "./syntheticHost";

import type {
  SyntheticHostCommandInvocation,
  SyntheticHostSeed,
} from "./syntheticHost";

const world = createWorldState({
  simulationTime:
    "2026-08-20T15:00:00.000Z",
  devices: [
    {
      id: "device-fin-04",
      organizationId: "org-acme",
      hostname: "FIN-LT-04",
      operatingSystem: "Synthetic Windows 11",
      status: "active",
      ownerUserId: "user-sarah",
      ipAddresses: ["10.20.30.44"],
    },
  ],
});

const hostSeed: SyntheticHostSeed = {
  deviceId: "device-fin-04",
  capabilities: [
    "read:filesystem",
    "read:processes",
    "read:services",
    "read:identity",
    "read:configuration",
    "read:logs",
    "read:network",
    "manage:services",
    "terminate:process",
    "quarantine:file",
  ],
  files: [
    {
      path: "/Users/Sarah/AppData/Local/Temp/update.ps1",
      content: "Write-Output synthetic",
      sha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      owner: "sarah",
      group: "Users",
      quarantined: false,
    },
    {
      path: "/Windows/System32/drivers/etc/hosts",
      content: "127.0.0.1 localhost",
      owner: "SYSTEM",
      group: "Administrators",
      quarantined: false,
    },
  ],
  processes: [
    {
      pid: 6172,
      image: "explorer.exe",
      commandLine: "explorer.exe",
      accountId: "account-sarah",
      state: "running",
      startedAt:
        "2026-08-20T14:40:00.000Z",
    },
    {
      pid: 8420,
      image: "powershell.exe",
      commandLine:
        "powershell.exe -EncodedCommand <synthetic>",
      parentPid: 6172,
      accountId: "account-sarah",
      state: "running",
      startedAt:
        "2026-08-20T14:58:00.000Z",
    },
  ],
  services: [
    {
      name: "SyntheticUpdater",
      executable:
        "/Program Files/Acme/updater.exe",
      startupMode: "automatic",
      status: "running",
      account: "SYSTEM",
    },
  ],
  users: [
    {
      username: "sarah",
      enabled: true,
      groups: ["Users"],
    },
  ],
  groups: [
    {
      name: "Administrators",
      members: ["SYSTEM"],
    },
    {
      name: "Users",
      members: ["sarah"],
    },
  ],
  configuration: {
    "HKCU/Software/Acme/Updater/Channel":
      "stable",
    "HKCU/Software/Acme/Updater/Telemetry":
      true,
  },
  logs: [
    {
      id: "host-log-2",
      timestamp:
        "2026-08-20T14:59:00.000Z",
      channel: "PowerShell",
      level: "warning",
      source: "PowerShell",
      message:
        "Encoded command executed in synthetic host.",
    },
    {
      id: "host-log-1",
      timestamp:
        "2026-08-20T14:50:00.000Z",
      channel: "System",
      level: "information",
      source: "Service Control Manager",
      message:
        "SyntheticUpdater entered running state.",
    },
  ],
  network: {
    listeners: [
      {
        id: "listener-updater",
        protocol: "tcp",
        address: "127.0.0.1",
        port: 8787,
        processId: 6172,
      },
    ],
    connections: [
      {
        id: "connection-powershell",
        protocol: "tcp",
        localAddress: "10.20.30.44",
        localPort: 51044,
        remoteAddress: "203.0.113.45",
        remotePort: 443,
        state: "established",
        processId: 8420,
      },
    ],
  },
};

function invocation(
  id: string,
  timestamp: string,
  command: SyntheticHostCommandInvocation["command"],
): SyntheticHostCommandInvocation {
  return {
    id,
    timestamp,
    actorId: "analyst-1",
    command,
  };
}

describe("synthetic host runtime", () => {
  it("attaches host state to a canonical Fabric device", () => {
    const host = createSyntheticHostState(
      hostSeed,
      world,
    );

    expect(host.deviceId).toBe(
      "device-fin-04",
    );
    expect(() =>
      createSyntheticHostState(
        {
          ...hostSeed,
          deviceId: "missing-device",
        },
        world,
      ),
    ).toThrow(
      "Synthetic host references missing device: missing-device",
    );
  });

  it("returns deterministic investigation views without mutating host state", () => {
    const host = createSyntheticHostState(
      hostSeed,
      world,
    );

    const files = executeSyntheticHostCommand(
      host,
      invocation(
        "command-list-files",
        "2026-08-20T15:01:00.000Z",
        {
          type: "list_files",
          prefix: "/Users/Sarah",
        },
      ),
    );
    const processes =
      executeSyntheticHostCommand(
        host,
        invocation(
          "command-list-processes",
          "2026-08-20T15:01:01.000Z",
          { type: "list_processes" },
        ),
      );
    const config = executeSyntheticHostCommand(
      host,
      invocation(
        "command-read-config",
        "2026-08-20T15:01:02.000Z",
        {
          type: "read_config",
          key: "HKCU/Software/Acme/Updater/Channel",
        },
      ),
    );
    const network =
      executeSyntheticHostCommand(
        host,
        invocation(
          "command-list-network",
          "2026-08-20T15:01:03.000Z",
          { type: "list_network" },
        ),
      );

    expect(files.result).toEqual({
      kind: "files",
      files: [
        expect.objectContaining({
          path: "/Users/Sarah/AppData/Local/Temp/update.ps1",
        }),
      ],
    });
    expect(processes.result).toMatchObject({
      kind: "processes",
      processes: [
        { pid: 6172 },
        { pid: 8420 },
      ],
    });
    expect(config.result).toEqual({
      kind: "configuration",
      key: "HKCU/Software/Acme/Updater/Channel",
      value: "stable",
    });
    expect(network.result).toMatchObject({
      kind: "network",
      network: {
        connections: [
          {
            remoteAddress: "203.0.113.45",
            remotePort: 443,
          },
        ],
      },
    });
    expect(files.state).toBe(host);
    expect(processes.state).toBe(host);
  });

  it("enforces explicit host capabilities", () => {
    const host = createSyntheticHostState(
      {
        deviceId: "device-fin-04",
        capabilities: [
          "read:filesystem",
        ],
      },
      world,
    );

    expect(() =>
      executeSyntheticHostCommand(
        host,
        invocation(
          "command-denied",
          "2026-08-20T15:02:00.000Z",
          {
            type: "stop_service",
            name: "SyntheticUpdater",
          },
        ),
      ),
    ).toThrow(
      "Synthetic host device-fin-04 does not permit capability: manage:services",
    );
  });

  it("performs validated service process and file mutations with audit records", () => {
    const initial = createSyntheticHostState(
      hostSeed,
      world,
    );

    const stopped = executeSyntheticHostCommand(
      initial,
      invocation(
        "command-stop-service",
        "2026-08-20T15:03:00.000Z",
        {
          type: "stop_service",
          name: "SyntheticUpdater",
        },
      ),
    );
    const terminated =
      executeSyntheticHostCommand(
        stopped.state,
        invocation(
          "command-terminate-process",
          "2026-08-20T15:03:01.000Z",
          {
            type: "terminate_process",
            pid: 8420,
          },
        ),
      );
    const quarantined =
      executeSyntheticHostCommand(
        terminated.state,
        invocation(
          "command-quarantine-file",
          "2026-08-20T15:03:02.000Z",
          {
            type: "quarantine_file",
            path: "/Users/Sarah/AppData/Local/Temp/update.ps1",
            destinationPath:
              "/Quarantine/update.ps1",
          },
        ),
      );

    expect(
      stopped.state.services[0]?.status,
    ).toBe("stopped");
    expect(
      terminated.state.processes.find(
        (process) => process.pid === 8420,
      ),
    ).toMatchObject({
      state: "terminated",
      terminatedAt:
        "2026-08-20T15:03:01.000Z",
    });
    expect(
      quarantined.state.files.find(
        (file) =>
          file.path ===
          "/Quarantine/update.ps1",
      ),
    ).toMatchObject({
      quarantined: true,
      originalPath:
        "/Users/Sarah/AppData/Local/Temp/update.ps1",
    });
    expect(quarantined.audit).toEqual({
      id: "command-quarantine-file",
      timestamp:
        "2026-08-20T15:03:02.000Z",
      deviceId: "device-fin-04",
      actorId: "analyst-1",
      commandType: "quarantine_file",
      mutation: true,
      summary:
        "Quarantined synthetic host file /Users/Sarah/AppData/Local/Temp/update.ps1 to /Quarantine/update.ps1.",
    });
    expect(initial.services[0]?.status).toBe(
      "running",
    );
    expect(
      initial.processes.find(
        (process) => process.pid === 8420,
      )?.state,
    ).toBe("running");
  });

  it("replays the same ordered command sequence to the same host state", () => {
    const initial = createSyntheticHostState(
      hostSeed,
      world,
    );
    const commands = [
      invocation(
        "replay-stop",
        "2026-08-20T15:04:00.000Z",
        {
          type: "stop_service",
          name: "SyntheticUpdater",
        },
      ),
      invocation(
        "replay-terminate",
        "2026-08-20T15:04:01.000Z",
        {
          type: "terminate_process",
          pid: 8420,
        },
      ),
    ] as const;

    const first = replaySyntheticHostCommands(
      initial,
      commands,
    );
    const second = replaySyntheticHostCommands(
      initial,
      commands,
    );

    expect(second).toEqual(first);
    expect(first.executions).toHaveLength(2);
    expect(first.state).not.toBe(initial);

    expect(() =>
      replaySyntheticHostCommands(
        initial,
        [
          commands[1],
          commands[0],
        ],
      ),
    ).toThrow(
      "Synthetic host command timestamp regressed at replay-stop.",
    );
  });

  it("reset reconstructs the authored initial host exactly", () => {
    const initial = createSyntheticHostState(
      hostSeed,
      world,
    );
    const mutated = executeSyntheticHostCommand(
      initial,
      invocation(
        "command-reset-source",
        "2026-08-20T15:05:00.000Z",
        {
          type: "terminate_process",
          pid: 8420,
        },
      ),
    ).state;

    expect(mutated).not.toEqual(initial);
    expect(
      resetSyntheticHostState(
        hostSeed,
        world,
      ),
    ).toEqual(initial);
  });

  it("round-trips JSON serialization and revalidates the Fabric attachment", () => {
    const host = createSyntheticHostState(
      hostSeed,
      world,
    );
    const serialized =
      serializeSyntheticHostState(host);

    expect(
      deserializeSyntheticHostState(
        serialized,
        world,
      ),
    ).toEqual(host);

    expect(() =>
      deserializeSyntheticHostState(
        serialized,
        createWorldState({
          simulationTime:
            "2026-08-20T15:00:00.000Z",
        }),
      ),
    ).toThrow(
      "Synthetic host references missing device: device-fin-04",
    );
  });
});
