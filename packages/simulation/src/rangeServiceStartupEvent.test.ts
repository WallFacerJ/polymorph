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
  edrHostActivityProjection,
} from "./edrHostActivityProjection";

import {
  rebuildProjection,
} from "./projection";

import {
  replayRangeCommandsWithEvents,
} from "./rangeEventBridge";

import {
  compileScenarioDefinition,
} from "./scenarioCompiler";

import {
  siemProjection,
} from "./siemProjection";

const scenarioUrl = new URL(
  "../../../apps/web/public/scenarios/account-compromise.json",
  import.meta.url,
);

function loadHost() {
  const parsed = parseScenarioJson(
    readFileSync(scenarioUrl, "utf8"),
  );
  const scenario = compileScenarioDefinition(
    parsed.scenario,
  );
  const host = scenario.syntheticHosts?.[0];

  if (!host) {
    throw new Error("Expected Finance synthetic host.");
  }

  return host;
}

describe("Range service startup-mode canonical event", () => {
  it("changes persistence policy without changing running state and projects the event", () => {
    const host = loadHost();
    const replay = replayRangeCommandsWithEvents(
      host,
      [
        {
          id: "range-set-startup",
          timestamp: "2026-08-20T15:06:00Z",
          actorId: "analyst-range",
          command: {
            type: "set_service_startup_mode",
            name: "AcmeBackupAgent",
            startupMode: "disabled",
          },
        },
      ],
    );

    expect(
      replay.state.services.find(
        (service) =>
          service.name === "AcmeBackupAgent",
      ),
    ).toMatchObject({
      startupMode: "disabled",
      status: "running",
    });
    expect(replay.events).toEqual([
      expect.objectContaining({
        id: "range-set-startup-event",
        type: "HOST_SERVICE_STARTUP_MODE_CHANGED",
        source: "range",
        payload: {
          deviceId: "device-fin-lt-04",
          serviceName: "AcmeBackupAgent",
          previousStartupMode: "automatic",
          startupMode: "disabled",
        },
      }),
    ]);

    const siem = rebuildProjection(
      siemProjection,
      replay.events,
    );
    const edrHost = rebuildProjection(
      edrHostActivityProjection,
      replay.events,
    );

    expect(siem.events[0]).toMatchObject({
      eventType:
        "HOST_SERVICE_STARTUP_MODE_CHANGED",
      family: "host",
      fields: {
        deviceId: "device-fin-lt-04",
        serviceName: "AcmeBackupAgent",
        previousStartupMode: "automatic",
        startupMode: "disabled",
      },
    });
    expect(edrHost.observations[0]).toMatchObject({
      eventType:
        "HOST_SERVICE_STARTUP_MODE_CHANGED",
      targetId: "AcmeBackupAgent",
      summary:
        "Range changed service AcmeBackupAgent startup mode: automatic -> disabled.",
    });
  });

  it("does not create a canonical event for a startup-mode no-op", () => {
    const host = loadHost();
    const replay = replayRangeCommandsWithEvents(
      host,
      [
        {
          id: "range-set-startup-noop",
          timestamp: "2026-08-20T15:06:00Z",
          command: {
            type: "set_service_startup_mode",
            name: "AcmeBackupAgent",
            startupMode: "automatic",
          },
        },
      ],
    );

    expect(replay.events).toEqual([]);
    expect(
      replay.state.services.find(
        (service) =>
          service.name === "AcmeBackupAgent",
      )?.status,
    ).toBe("running");
  });
});
