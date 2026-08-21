import {
  describe,
  expect,
  it,
} from "vitest";

import {
  exampleDevice,
} from "@polymorph/domain";

import {
  validateSimulationEvent,
} from "./eventValidation";

import {
  createRangeArtifact,
} from "./rangeArtifact";

import {
  createRangeArtifactEvidenceEvent,
} from "./rangeArtifactEvent";

import {
  createSyntheticHostState,
  executeSyntheticHostCommand,
} from "./syntheticHost";

import {
  createWorldState,
} from "./worldState";

function createEvent() {
  const host = createSyntheticHostState({
    deviceId: exampleDevice.id,
    capabilities: ["read:network"],
    network: {
      listeners: [],
      connections: [
        {
          id: "connection-one",
          protocol: "tcp",
          localAddress: "10.0.0.5",
          localPort: 49000,
          remoteAddress: "203.0.113.77",
          remotePort: 443,
          state: "established",
        },
      ],
    },
  });
  const invocation = {
    id: "range-command-validation",
    timestamp: "2026-08-21T05:10:00.000Z",
    command: {
      type: "list_network" as const,
    },
  };
  const execution = executeSyntheticHostCommand(
    host,
    invocation,
  );
  const artifact = createRangeArtifact({
    id: "range-command-validation-artifact",
    acquiredAt: "2026-08-21T05:10:00.001Z",
    deviceId: exampleDevice.id,
    invocation,
    execution,
  });

  return createRangeArtifactEvidenceEvent({
    id: "range-command-validation-evidence",
    timestamp: "2026-08-21T05:10:00.002Z",
    artifact,
  });
}

function createWorld() {
  return createWorldState({
    simulationTime: "2026-08-21T05:00:00.000Z",
    devices: [exampleDevice],
  });
}

describe("Range artifact event validation", () => {
  it("accepts coherent embedded artifact provenance", () => {
    expect(() =>
      validateSimulationEvent(
        createWorld(),
        createEvent(),
      ),
    ).not.toThrow();
  });

  it("rejects an artifact id that diverges from canonical provenance", () => {
    const event = createEvent();
    const tampered = {
      ...event,
      payload: {
        ...event.payload,
        artifactId: "different-artifact",
      },
    };

    expect(() =>
      validateSimulationEvent(
        createWorld(),
        tampered,
      ),
    ).toThrow(
      "Range artifact id does not match evidence artifact id",
    );
  });

  it("rejects source-reference tampering", () => {
    const event = createEvent();
    const tampered = {
      ...event,
      payload: {
        ...event.payload,
        sourceReference: "network:other",
      },
    };

    expect(() =>
      validateSimulationEvent(
        createWorld(),
        tampered,
      ),
    ).toThrow(
      "source reference is inconsistent",
    );
  });
});
