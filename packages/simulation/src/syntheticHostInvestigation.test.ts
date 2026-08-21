import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getSyntheticHostServiceInvestigation,
} from "./syntheticHostInvestigation";

import {
  createSyntheticHostState,
} from "./syntheticHost";

import type {
  SyntheticHostAuthoredRelationship,
} from "./syntheticHostRelationship";

const host = createSyntheticHostState({
  deviceId: "device-fin-lt-04",
  processes: [
    {
      pid: 5040,
      image:
        "C:\\Program Files\\Acme\\Telemetry\\telemetry.exe",
      commandLine: "telemetry.exe --service",
      state: "running",
    },
  ],
  services: [
    {
      name: "AcmeTelemetry",
      executable:
        "C:\\Program Files\\Acme\\Telemetry\\telemetry.exe",
      startupMode: "automatic",
      status: "running",
      account: "LocalSystem",
    },
  ],
  configuration: {
    "HKLM/Software/Acme/Telemetry/Enabled": true,
  },
});

const relationships:
  readonly SyntheticHostAuthoredRelationship[] = [
    {
      id: "rel-telemetry-process",
      type: "service_process",
      serviceName: "AcmeTelemetry",
      processId: 5040,
    },
    {
      id: "rel-telemetry-policy",
      type: "service_configuration",
      serviceName: "AcmeTelemetry",
      key: "HKLM/Software/Acme/Telemetry/Enabled",
      purpose: "policy",
    },
  ];

describe("relationship-aware synthetic host investigation", () => {
  it("resolves service executable, process, and configuration context", () => {
    const investigation =
      getSyntheticHostServiceInvestigation(
        host,
        relationships,
        "AcmeTelemetry",
      );

    expect(investigation.executable).toBe(
      "C:\\Program Files\\Acme\\Telemetry\\telemetry.exe",
    );
    expect(investigation.processIds).toEqual([
      5040,
    ]);
    expect(investigation.configurationKeys).toEqual([
      "HKLM/Software/Acme/Telemetry/Enabled",
    ]);
    expect(investigation.relatedRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "service",
          id: "AcmeTelemetry",
        },
        {
          kind: "process",
          id: "5040",
        },
        {
          kind: "configuration",
          id: "HKLM/Software/Acme/Telemetry/Enabled",
        },
      ]),
    );
  });

  it("rejects unknown services", () => {
    expect(() =>
      getSyntheticHostServiceInvestigation(
        host,
        relationships,
        "MissingService",
      ),
    ).toThrow(
      "Synthetic host service not found: MissingService",
    );
  });
});
