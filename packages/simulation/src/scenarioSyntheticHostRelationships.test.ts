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
  validateScenarioDefinition,
} from "./scenario";

import {
  compileScenarioDefinition,
} from "./scenarioCompiler";

const accountScenarioUrl = new URL(
  "../../../apps/web/public/scenarios/account-compromise.json",
  import.meta.url,
);

function loadScenarioInput() {
  return parseScenarioJson(
    readFileSync(
      accountScenarioUrl,
      "utf8",
    ),
  ).scenario;
}

describe("scenario synthetic host relationships", () => {
  it("compiles authored relationships beside immutable host state", () => {
    const input = loadScenarioInput();
    const host = input.syntheticHosts[0];

    expect(host).toBeDefined();

    const scenario = compileScenarioDefinition({
      ...input,
      syntheticHosts: [
        {
          ...host!,
          relationships: [
            {
              id: "rel-powershell-script",
              type: "process_file",
              processId: 8420,
              filePath:
                "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
              operation: "execute",
            },
            {
              id: "rel-backup-config",
              type: "service_configuration",
              serviceName: "AcmeBackupAgent",
              key:
                "HKLM/System/CurrentControlSet/Services/AcmeBackupAgent/Start",
              purpose: "startup",
            },
          ],
        },
      ],
    });

    expect(
      scenario.syntheticHostRelationships,
    ).toEqual([
      {
        deviceId: "device-fin-lt-04",
        relationships: [
          expect.objectContaining({
            id: "rel-powershell-script",
            type: "process_file",
            processId: 8420,
          }),
          expect.objectContaining({
            id: "rel-backup-config",
            type: "service_configuration",
            serviceName: "AcmeBackupAgent",
          }),
        ],
      },
    ]);
  });

  it("rejects relationship endpoints that are not authored on the host", () => {
    const input = loadScenarioInput();
    const host = input.syntheticHosts[0];

    expect(host).toBeDefined();

    expect(() =>
      compileScenarioDefinition({
        ...input,
        syntheticHosts: [
          {
            ...host!,
            relationships: [
              {
                id: "rel-missing-file",
                type: "process_file",
                processId: 8420,
                filePath: "/missing.ps1",
                operation: "execute",
              },
            ],
          },
        ],
      }),
    ).toThrow(
      "Synthetic host relationship rel-missing-file references missing file: /missing.ps1",
    );
  });

  it("revalidates relationship sets for programmatically constructed scenarios", () => {
    const scenario = compileScenarioDefinition(
      loadScenarioInput(),
    );

    expect(() =>
      validateScenarioDefinition({
        ...scenario,
        syntheticHostRelationships: [
          {
            deviceId: "device-fin-lt-04",
            relationships: [
              {
                id: "rel-invalid-after-compile",
                type: "process_file",
                processId: 8420,
                filePath: "/missing-after-compile.ps1",
                operation: "read",
              },
            ],
          },
        ],
      }),
    ).toThrow(
      "Synthetic host relationship rel-invalid-after-compile references missing file: /missing-after-compile.ps1",
    );
  });
});
