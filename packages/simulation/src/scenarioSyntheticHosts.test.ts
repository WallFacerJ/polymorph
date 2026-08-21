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

const hrScenarioUrl = new URL(
  "../../../apps/web/public/scenarios/hr-malware-beacon.json",
  import.meta.url,
);

function loadScenarioInput(
  url: URL,
) {
  return parseScenarioJson(
    readFileSync(url, "utf8"),
  ).scenario;
}

describe("scenario synthetic hosts", () => {
  it("compiles the authored FIN-LT-04 host against the shared Fabric device", () => {
    const scenario =
      compileScenarioDefinition(
        loadScenarioInput(
          accountScenarioUrl,
        ),
      );
    const hosts =
      scenario.syntheticHosts ?? [];

    expect(hosts).toHaveLength(1);
    expect(hosts[0]?.deviceId).toBe(
      "device-fin-lt-04",
    );
    expect(
      hosts[0]?.processes.find(
        (process) =>
          process.pid === 8420,
      ),
    ).toMatchObject({
      image:
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      parentPid: 6172,
      accountId: "account-smartinez",
      state: "running",
    });
    expect(
      hosts[0]?.network.connections.find(
        (connection) =>
          connection.processId === 8420,
      ),
    ).toMatchObject({
      remoteAddress: "203.0.113.77",
      remotePort: 443,
      state: "established",
    });
  });

  it("defaults scenarios without Range content to no synthetic hosts", () => {
    const input =
      loadScenarioInput(hrScenarioUrl);

    expect(input.syntheticHosts)
      .toEqual([]);
    expect(
      compileScenarioDefinition(input)
        .syntheticHosts,
    ).toEqual([]);
  });

  it("rejects duplicate synthetic hosts for the same device", () => {
    const input =
      loadScenarioInput(
        accountScenarioUrl,
      );
    const host = input.syntheticHosts[0];

    expect(host).toBeDefined();

    expect(() =>
      compileScenarioDefinition({
        ...input,
        syntheticHosts: [
          host!,
          structuredClone(host!),
        ],
      }),
    ).toThrow(
      "Scenario scenario-account-compromise-001 defines duplicate synthetic host for device: device-fin-lt-04",
    );
  });

  it("rejects a synthetic host that is not attached to a canonical device", () => {
    const input =
      loadScenarioInput(
        accountScenarioUrl,
      );
    const host = input.syntheticHosts[0];

    expect(host).toBeDefined();

    expect(() =>
      compileScenarioDefinition({
        ...input,
        syntheticHosts: [
          {
            ...host!,
            deviceId: "device-missing",
          },
        ],
      }),
    ).toThrow(
      "Synthetic host references missing device: device-missing",
    );
  });
});
