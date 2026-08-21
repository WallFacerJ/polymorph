import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSyntheticHostState,
  executeSyntheticHostCommand,
  replaySyntheticHostCommands,
  resetSyntheticHostState,
} from "./syntheticHost";

const seed = {
  deviceId: "device-fin-lt-04",
  capabilities: [
    "manage:services" as const,
  ],
  services: [
    {
      name: "AcmeBackupAgent",
      executable:
        "C:\\Program Files\\Acme\\BackupAgent\\backup-agent.exe",
      startupMode: "automatic" as const,
      status: "running" as const,
      account: "LocalSystem",
    },
  ],
};

function startupInvocation(
  startupMode: "automatic" | "manual" | "disabled",
) {
  return {
    id: `startup-${startupMode}`,
    timestamp: "2026-08-20T15:06:00Z",
    command: {
      type: "set_service_startup_mode" as const,
      name: "AcmeBackupAgent",
      startupMode,
    },
  };
}

describe("synthetic host service startup mode", () => {
  it("changes startup policy without changing current service status", () => {
    const initial = createSyntheticHostState(seed);
    const execution = executeSyntheticHostCommand(
      initial,
      startupInvocation("disabled"),
    );

    expect(execution.result).toEqual({
      kind: "mutation",
      changed: true,
      targetType: "service",
      targetId: "AcmeBackupAgent",
    });
    expect(execution.state.services[0]).toMatchObject({
      startupMode: "disabled",
      status: "running",
    });
    expect(execution.audit.summary).toBe(
      "Changed synthetic host service AcmeBackupAgent startup mode automatic -> disabled.",
    );
    expect(initial.services[0]).toMatchObject({
      startupMode: "automatic",
      status: "running",
    });
  });

  it("records a deterministic no-op when startup policy already matches", () => {
    const initial = createSyntheticHostState(seed);
    const execution = executeSyntheticHostCommand(
      initial,
      startupInvocation("automatic"),
    );

    expect(execution.result).toMatchObject({
      kind: "mutation",
      changed: false,
    });
    expect(execution.state).toBe(initial);
  });

  it("replays deterministically and reset restores the authored policy", () => {
    const initial = createSyntheticHostState(seed);
    const first = replaySyntheticHostCommands(
      initial,
      [startupInvocation("manual")],
    );
    const second = replaySyntheticHostCommands(
      initial,
      [startupInvocation("manual")],
    );

    expect(second).toEqual(first);
    expect(first.state.services[0]?.startupMode).toBe(
      "manual",
    );
    expect(
      resetSyntheticHostState(seed).services[0]?.startupMode,
    ).toBe("automatic");
  });

  it("still requires the existing service-management capability", () => {
    const host = createSyntheticHostState({
      ...seed,
      capabilities: [],
    });

    expect(() =>
      executeSyntheticHostCommand(
        host,
        startupInvocation("disabled"),
      ),
    ).toThrow(
      "Synthetic host device-fin-lt-04 does not permit capability: manage:services",
    );
  });
});
