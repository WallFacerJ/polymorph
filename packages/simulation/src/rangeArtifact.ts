import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import type {
  SyntheticHostCommand,
  SyntheticHostCommandExecution,
  SyntheticHostCommandInvocation,
  SyntheticHostConfigValue,
  SyntheticHostFile,
  SyntheticHostLocalGroup,
  SyntheticHostLocalUser,
  SyntheticHostLogRecord,
  SyntheticHostNetworkState,
  SyntheticHostProcess,
  SyntheticHostService,
} from "./syntheticHost";

export type RangeArtifactKind =
  | "file"
  | "process"
  | "service"
  | "identity"
  | "configuration"
  | "log"
  | "network";

export type RangeArtifactAcquisitionMethod =
  "controlled_range_command";

export type RangeArtifactIntegrity =
  | {
      status: "authored";
      algorithm: "sha256";
      value: string;
    }
  | {
      status: "unavailable";
      reason: "source_did_not_provide_integrity";
    };

export interface RangeArtifactBase {
  id: EntityId;
  kind: RangeArtifactKind;
  deviceId: EntityId;
  invocationId: string;
  commandType: SyntheticHostCommand["type"];
  acquiredAt: SimulationTimestamp;
  acquisitionMethod: RangeArtifactAcquisitionMethod;
  sourceReference: string;
  relatedEntityIds: readonly EntityId[];
  indicatorIps: readonly string[];
  integrity: RangeArtifactIntegrity;
}

export interface RangeFileArtifact
  extends RangeArtifactBase {
  kind: "file";
  snapshot:
    | {
        scope: "single";
        file: SyntheticHostFile;
      }
    | {
        scope: "inventory";
        files: readonly SyntheticHostFile[];
      };
}

export interface RangeProcessArtifact
  extends RangeArtifactBase {
  kind: "process";
  snapshot:
    | {
        scope: "single";
        process: SyntheticHostProcess;
      }
    | {
        scope: "inventory";
        processes: readonly SyntheticHostProcess[];
      };
}

export interface RangeServiceArtifact
  extends RangeArtifactBase {
  kind: "service";
  snapshot:
    | {
        scope: "single";
        service: SyntheticHostService;
      }
    | {
        scope: "inventory";
        services: readonly SyntheticHostService[];
      };
}

export interface RangeIdentityArtifact
  extends RangeArtifactBase {
  kind: "identity";
  snapshot:
    | {
        scope: "users";
        users: readonly SyntheticHostLocalUser[];
      }
    | {
        scope: "groups";
        groups: readonly SyntheticHostLocalGroup[];
      };
}

export interface RangeConfigurationArtifact
  extends RangeArtifactBase {
  kind: "configuration";
  snapshot: {
    key: string;
    value: SyntheticHostConfigValue;
  };
}

export interface RangeLogArtifact
  extends RangeArtifactBase {
  kind: "log";
  snapshot: {
    channel: string | null;
    records: readonly SyntheticHostLogRecord[];
  };
}

export interface RangeNetworkArtifact
  extends RangeArtifactBase {
  kind: "network";
  snapshot: SyntheticHostNetworkState;
}

export type RangeArtifact =
  | RangeFileArtifact
  | RangeProcessArtifact
  | RangeServiceArtifact
  | RangeIdentityArtifact
  | RangeConfigurationArtifact
  | RangeLogArtifact
  | RangeNetworkArtifact;

export interface CreateRangeArtifactInput {
  id: EntityId;
  acquiredAt: SimulationTimestamp;
  deviceId: EntityId;
  invocation: SyntheticHostCommandInvocation;
  execution: SyntheticHostCommandExecution;
}

function uniqueStrings(
  values: readonly (string | undefined)[],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
}

function unavailableIntegrity(): RangeArtifactIntegrity {
  return {
    status: "unavailable",
    reason: "source_did_not_provide_integrity",
  };
}

function fileIntegrity(
  file: SyntheticHostFile,
): RangeArtifactIntegrity {
  return file.sha256
    ? {
        status: "authored",
        algorithm: "sha256",
        value: file.sha256,
      }
    : unavailableIntegrity();
}

function baseArtifact(
  input: CreateRangeArtifactInput,
  kind: RangeArtifactKind,
  sourceReference: string,
  relatedEntityIds: readonly EntityId[] = [
    input.deviceId,
  ],
  indicatorIps: readonly string[] = [],
  integrity: RangeArtifactIntegrity =
    unavailableIntegrity(),
): RangeArtifactBase {
  if (input.execution.state.deviceId !== input.deviceId) {
    throw new Error(
      `Range artifact device mismatch: ${input.deviceId} != ${input.execution.state.deviceId}.`,
    );
  }

  return {
    id: input.id,
    kind,
    deviceId: input.deviceId,
    invocationId: input.invocation.id,
    commandType: input.invocation.command.type,
    acquiredAt: input.acquiredAt,
    acquisitionMethod: "controlled_range_command",
    sourceReference,
    relatedEntityIds: [...relatedEntityIds],
    indicatorIps: [...indicatorIps],
    integrity,
  };
}

export function createRangeArtifact(
  input: CreateRangeArtifactInput,
): RangeArtifact {
  const result = input.execution.result;

  switch (result.kind) {
    case "file":
      return {
        ...baseArtifact(
          input,
          "file",
          result.file.path,
          [input.deviceId],
          [],
          fileIntegrity(result.file),
        ),
        kind: "file",
        snapshot: {
          scope: "single",
          file: structuredClone(result.file),
        },
      };

    case "files":
      return {
        ...baseArtifact(
          input,
          "file",
          input.invocation.command.type === "list_files"
            ? `filesystem:${input.invocation.command.prefix ?? "/"}`
            : "filesystem:/",
        ),
        kind: "file",
        snapshot: {
          scope: "inventory",
          files: structuredClone(result.files),
        },
      };

    case "process":
      return {
        ...baseArtifact(
          input,
          "process",
          `process:${result.process.pid}`,
          uniqueStrings([
            input.deviceId,
            result.process.accountId,
          ]),
        ),
        kind: "process",
        snapshot: {
          scope: "single",
          process: structuredClone(result.process),
        },
      };

    case "processes":
      return {
        ...baseArtifact(
          input,
          "process",
          "process:inventory",
          uniqueStrings([
            input.deviceId,
            ...result.processes.map(
              (process) => process.accountId,
            ),
          ]),
        ),
        kind: "process",
        snapshot: {
          scope: "inventory",
          processes: structuredClone(result.processes),
        },
      };

    case "service":
      return {
        ...baseArtifact(
          input,
          "service",
          `service:${result.service.name}`,
        ),
        kind: "service",
        snapshot: {
          scope: "single",
          service: structuredClone(result.service),
        },
      };

    case "services":
      return {
        ...baseArtifact(
          input,
          "service",
          "service:inventory",
        ),
        kind: "service",
        snapshot: {
          scope: "inventory",
          services: structuredClone(result.services),
        },
      };

    case "users":
      return {
        ...baseArtifact(
          input,
          "identity",
          "identity:local-users",
        ),
        kind: "identity",
        snapshot: {
          scope: "users",
          users: structuredClone(result.users),
        },
      };

    case "groups":
      return {
        ...baseArtifact(
          input,
          "identity",
          "identity:local-groups",
        ),
        kind: "identity",
        snapshot: {
          scope: "groups",
          groups: structuredClone(result.groups),
        },
      };

    case "configuration":
      return {
        ...baseArtifact(
          input,
          "configuration",
          `configuration:${result.key}`,
        ),
        kind: "configuration",
        snapshot: {
          key: result.key,
          value: structuredClone(result.value),
        },
      };

    case "logs": {
      const channel =
        input.invocation.command.type === "list_logs"
          ? input.invocation.command.channel ?? null
          : null;

      return {
        ...baseArtifact(
          input,
          "log",
          `logs:${channel ?? "all"}`,
        ),
        kind: "log",
        snapshot: {
          channel,
          records: structuredClone(result.logs),
        },
      };
    }

    case "network": {
      const indicatorIps = uniqueStrings([
        ...result.network.connections.flatMap(
          (connection) => [
            connection.localAddress,
            connection.remoteAddress,
          ],
        ),
        ...result.network.listeners.map(
          (listener) => listener.address,
        ),
      ]);

      return {
        ...baseArtifact(
          input,
          "network",
          "network:state",
          [input.deviceId],
          indicatorIps,
        ),
        kind: "network",
        snapshot: structuredClone(result.network),
      };
    }

    case "mutation":
      throw new Error(
        "Range mutation executions cannot be acquired as evidence artifacts.",
      );
  }
}

export function summarizeRangeArtifact(
  artifact: RangeArtifact,
): string {
  switch (artifact.kind) {
    case "file":
      return artifact.snapshot.scope === "single"
        ? `Range file artifact ${artifact.snapshot.file.path}`
        : `Range filesystem artifact containing ${artifact.snapshot.files.length} file(s)`;

    case "process":
      return artifact.snapshot.scope === "single"
        ? `Range process artifact ${artifact.snapshot.process.pid}: ${artifact.snapshot.process.image}`
        : `Range process inventory artifact containing ${artifact.snapshot.processes.length} process(es)`;

    case "service":
      return artifact.snapshot.scope === "single"
        ? `Range service artifact ${artifact.snapshot.service.name}: ${artifact.snapshot.service.status}`
        : `Range service inventory artifact containing ${artifact.snapshot.services.length} service(s)`;

    case "identity":
      return artifact.snapshot.scope === "users"
        ? `Range local-user artifact containing ${artifact.snapshot.users.length} user(s)`
        : `Range local-group artifact containing ${artifact.snapshot.groups.length} group(s)`;

    case "configuration":
      return `Range configuration artifact ${artifact.snapshot.key}`;

    case "log":
      return `Range log artifact containing ${artifact.snapshot.records.length} record(s)`;

    case "network":
      return `Range network artifact containing ${artifact.snapshot.connections.length} connection(s) and ${artifact.snapshot.listeners.length} listener(s)`;
  }
}
