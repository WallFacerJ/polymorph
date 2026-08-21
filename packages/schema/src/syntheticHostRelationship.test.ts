import {
  describe,
  expect,
  it,
} from "vitest";

import {
  syntheticHostScenarioSchema,
} from "./syntheticHost";

describe("synthetic host relationship schema", () => {
  it("parses typed authored relationships", () => {
    const parsed = syntheticHostScenarioSchema.parse({
      deviceId: "device-fin-lt-04",
      relationships: [
        {
          id: "rel-script",
          type: "process_file",
          processId: 8420,
          filePath: "/tmp/finance-update.ps1",
          operation: "execute",
        },
        {
          id: "rel-service-process",
          type: "service_process",
          serviceName: "AcmeTelemetry",
          processId: 5040,
        },
        {
          id: "rel-process-persistence",
          type: "process_configuration",
          processId: 8420,
          key: "HKCU/Software/Acme/Run",
          purpose: "persistence",
        },
      ],
    });

    expect(parsed.relationships).toHaveLength(3);
    expect(parsed.relationships[0]).toMatchObject({
      type: "process_file",
      operation: "execute",
    });
    expect(parsed.relationships[2]).toMatchObject({
      type: "process_configuration",
      purpose: "persistence",
    });
  });

  it("rejects invalid relationship discriminators", () => {
    expect(() =>
      syntheticHostScenarioSchema.parse({
        deviceId: "device-fin-lt-04",
        relationships: [
          {
            id: "rel-invalid",
            type: "guessed_causality",
            processId: 8420,
            filePath: "/tmp/file.ps1",
          },
        ],
      }),
    ).toThrow();
  });
});
