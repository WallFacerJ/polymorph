import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSyntheticHostState,
} from "./syntheticHost";

import {
  buildSyntheticHostRelationshipGraph,
  getSyntheticHostProcessInvestigation,
  validateSyntheticHostRelationships,
} from "./syntheticHostRelationship";

import type {
  SyntheticHostAuthoredRelationship,
} from "./syntheticHostRelationship";

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
        pid: 6172,
        image: "WINWORD.EXE",
        commandLine: "WINWORD.EXE QuarterlyReview.docm",
        state: "running",
        accountId: "account-smartinez",
      },
      {
        pid: 8420,
        image: "powershell.exe",
        commandLine: "powershell.exe -File finance-update.ps1",
        parentPid: 6172,
        accountId: "account-smartinez",
        state: "running",
      },
      {
        pid: 5040,
        image: "telemetry.exe",
        commandLine: "telemetry.exe --service",
        state: "running",
      },
    ],
    services: [
      {
        name: "AcmeTelemetry",
        executable: "C:\\Program Files\\Acme\\Telemetry\\telemetry.exe",
        startupMode: "automatic",
        status: "running",
      },
    ],
    configuration: {
      "HKLM/Software/Acme/Telemetry/Enabled": true,
    },
    network: {
      listeners: [
        {
          id: "telemetry-listener",
          protocol: "tcp",
          address: "127.0.0.1",
          port: 8765,
          processId: 5040,
        },
      ],
      connections: [
        {
          id: "powershell-c2",
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

const relationships:
  readonly SyntheticHostAuthoredRelationship[] = [
    {
      id: "rel-powershell-script",
      type: "process_file",
      processId: 8420,
      filePath: scriptPath,
      operation: "execute",
    },
    {
      id: "rel-telemetry-process",
      type: "service_process",
      serviceName: "AcmeTelemetry",
      processId: 5040,
    },
    {
      id: "rel-telemetry-config",
      type: "service_configuration",
      serviceName: "AcmeTelemetry",
      key: "HKLM/Software/Acme/Telemetry/Enabled",
      purpose: "policy",
    },
  ];

describe("synthetic host relationship graph", () => {
  it("combines authoritative derived edges with explicitly authored relationships", () => {
    const graph =
      buildSyntheticHostRelationshipGraph(
        createHost(),
        relationships,
      );

    expect(graph).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "process_parent",
          authority: "derived",
          source: {
            kind: "process",
            id: "8420",
          },
          target: {
            kind: "process",
            id: "6172",
          },
        }),
        expect.objectContaining({
          type: "process_account",
          source: {
            kind: "process",
            id: "8420",
          },
          target: {
            kind: "account",
            id: "account-smartinez",
          },
        }),
        expect.objectContaining({
          type: "process_connection",
          source: {
            kind: "process",
            id: "8420",
          },
          target: {
            kind: "connection",
            id: "powershell-c2",
          },
        }),
        expect.objectContaining({
          id: "rel-powershell-script",
          type: "process_file",
          authority: "authored",
          source: {
            kind: "process",
            id: "8420",
          },
          target: {
            kind: "file",
            id: scriptPath,
          },
          detail: "execute",
        }),
      ]),
    );
  });

  it("provides one deterministic investigation neighborhood for a process", () => {
    const investigation =
      getSyntheticHostProcessInvestigation(
        createHost(),
        relationships,
        8420,
      );

    expect(investigation.relatedRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "process",
          id: "8420",
        },
        {
          kind: "process",
          id: "6172",
        },
        {
          kind: "account",
          id: "account-smartinez",
        },
        {
          kind: "connection",
          id: "powershell-c2",
        },
        {
          kind: "file",
          id: scriptPath,
        },
      ]),
    );
  });

  it("rejects authored relationships with missing endpoints", () => {
    expect(() =>
      validateSyntheticHostRelationships(
        createHost(),
        [
          {
            id: "rel-missing-file",
            type: "process_file",
            processId: 8420,
            filePath: "/missing.ps1",
            operation: "execute",
          },
        ],
      ),
    ).toThrow(
      "references missing file: /missing.ps1",
    );

    expect(() =>
      validateSyntheticHostRelationships(
        createHost(),
        [
          {
            id: "rel-missing-process",
            type: "service_process",
            serviceName: "AcmeTelemetry",
            processId: 9999,
          },
        ],
      ),
    ).toThrow(
      "references missing process pid: 9999",
    );
  });

  it("rejects duplicate authored relationship ids", () => {
    expect(() =>
      validateSyntheticHostRelationships(
        createHost(),
        [
          relationships[0],
          relationships[0],
        ],
      ),
    ).toThrow(
      "Synthetic host relationships contain duplicate id: rel-powershell-script",
    );
  });
});
