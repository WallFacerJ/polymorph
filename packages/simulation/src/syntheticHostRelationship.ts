import type {
  EntityId,
} from "@polymorph/domain";

import type {
  ScenarioDefinition,
} from "./scenario";

import type {
  SyntheticHostState,
} from "./syntheticHost";

export type SyntheticHostFileOperation =
  | "read"
  | "write"
  | "create"
  | "delete"
  | "execute";

export type SyntheticHostConfigurationPurpose =
  | "persistence"
  | "execution"
  | "policy"
  | "startup"
  | "other";

export type SyntheticHostAuthoredRelationship =
  | {
      id: string;
      type: "process_file";
      processId: number;
      filePath: string;
      operation: SyntheticHostFileOperation;
    }
  | {
      id: string;
      type: "service_process";
      serviceName: string;
      processId: number;
    }
  | {
      id: string;
      type: "process_configuration";
      processId: number;
      key: string;
      purpose: SyntheticHostConfigurationPurpose;
    }
  | {
      id: string;
      type: "service_configuration";
      serviceName: string;
      key: string;
      purpose: SyntheticHostConfigurationPurpose;
    };

export interface SyntheticHostRelationshipSet {
  deviceId: EntityId;
  relationships:
    readonly SyntheticHostAuthoredRelationship[];
}

export type SyntheticHostObjectKind =
  | "process"
  | "account"
  | "file"
  | "service"
  | "configuration"
  | "connection"
  | "listener"
  | "log"
  | "local_user"
  | "local_group";

export interface SyntheticHostObjectRef {
  kind: SyntheticHostObjectKind;
  id: string;
}

export type SyntheticHostResolvedRelationshipType =
  | "process_parent"
  | "process_account"
  | "process_connection"
  | "process_listener"
  | SyntheticHostAuthoredRelationship["type"];

export interface SyntheticHostResolvedRelationship {
  id: string;
  type: SyntheticHostResolvedRelationshipType;
  authority: "derived" | "authored";
  source: SyntheticHostObjectRef;
  target: SyntheticHostObjectRef;
  detail?: string;
}

export interface SyntheticHostProcessInvestigation {
  processId: number;
  relationships:
    readonly SyntheticHostResolvedRelationship[];
  relatedRefs:
    readonly SyntheticHostObjectRef[];
}

declare module "./scenario" {
  interface ScenarioDefinition {
    syntheticHostRelationships?:
      readonly SyntheticHostRelationshipSet[];
  }
}

function ref(
  kind: SyntheticHostObjectKind,
  id: string | number,
): SyntheticHostObjectRef {
  return {
    kind,
    id: String(id),
  };
}

export function syntheticHostObjectRefKey(
  value: SyntheticHostObjectRef,
): string {
  return `${value.kind}:${value.id}`;
}

function uniqueRefs(
  refs: readonly SyntheticHostObjectRef[],
): readonly SyntheticHostObjectRef[] {
  const seen = new Set<string>();
  const result: SyntheticHostObjectRef[] = [];

  for (const value of refs) {
    const key = syntheticHostObjectRefKey(value);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ ...value });
  }

  return result;
}

function requireRelationshipId(
  id: string,
): void {
  if (id.trim().length === 0) {
    throw new Error(
      "Synthetic host relationship id must not be empty.",
    );
  }
}

export function validateSyntheticHostRelationships(
  host: SyntheticHostState,
  relationships:
    readonly SyntheticHostAuthoredRelationship[],
): void {
  const processIds = new Set(
    host.processes.map((process) => process.pid),
  );
  const filePaths = new Set(
    host.files.map((file) => file.path),
  );
  const serviceNames = new Set(
    host.services.map((service) => service.name),
  );
  const configurationKeys = new Set(
    Object.keys(host.configuration),
  );
  const relationshipIds = new Set<string>();

  for (const relationship of relationships) {
    requireRelationshipId(relationship.id);

    if (relationshipIds.has(relationship.id)) {
      throw new Error(
        `Synthetic host relationships contain duplicate id: ${relationship.id}`,
      );
    }

    relationshipIds.add(relationship.id);

    switch (relationship.type) {
      case "process_file":
        if (!processIds.has(relationship.processId)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing process pid: ${relationship.processId}`,
          );
        }
        if (!filePaths.has(relationship.filePath)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing file: ${relationship.filePath}`,
          );
        }
        break;

      case "service_process":
        if (!serviceNames.has(relationship.serviceName)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing service: ${relationship.serviceName}`,
          );
        }
        if (!processIds.has(relationship.processId)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing process pid: ${relationship.processId}`,
          );
        }
        break;

      case "process_configuration":
        if (!processIds.has(relationship.processId)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing process pid: ${relationship.processId}`,
          );
        }
        if (!configurationKeys.has(relationship.key)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing configuration key: ${relationship.key}`,
          );
        }
        break;

      case "service_configuration":
        if (!serviceNames.has(relationship.serviceName)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing service: ${relationship.serviceName}`,
          );
        }
        if (!configurationKeys.has(relationship.key)) {
          throw new Error(
            `Synthetic host relationship ${relationship.id} references missing configuration key: ${relationship.key}`,
          );
        }
        break;
    }
  }
}

function derivedRelationships(
  host: SyntheticHostState,
): SyntheticHostResolvedRelationship[] {
  const result: SyntheticHostResolvedRelationship[] = [];

  for (const process of host.processes) {
    if (process.parentPid !== undefined) {
      result.push({
        id: `derived:process:${process.pid}:parent:${process.parentPid}`,
        type: "process_parent",
        authority: "derived",
        source: ref("process", process.pid),
        target: ref("process", process.parentPid),
      });
    }

    if (process.accountId !== undefined) {
      result.push({
        id: `derived:process:${process.pid}:account:${process.accountId}`,
        type: "process_account",
        authority: "derived",
        source: ref("process", process.pid),
        target: ref("account", process.accountId),
      });
    }
  }

  for (const connection of host.network.connections) {
    if (connection.processId === undefined) {
      continue;
    }

    result.push({
      id: `derived:process:${connection.processId}:connection:${connection.id}`,
      type: "process_connection",
      authority: "derived",
      source: ref("process", connection.processId),
      target: ref("connection", connection.id),
    });
  }

  for (const listener of host.network.listeners) {
    if (listener.processId === undefined) {
      continue;
    }

    result.push({
      id: `derived:process:${listener.processId}:listener:${listener.id}`,
      type: "process_listener",
      authority: "derived",
      source: ref("process", listener.processId),
      target: ref("listener", listener.id),
    });
  }

  return result;
}

function resolveAuthoredRelationship(
  relationship: SyntheticHostAuthoredRelationship,
): SyntheticHostResolvedRelationship {
  switch (relationship.type) {
    case "process_file":
      return {
        id: relationship.id,
        type: relationship.type,
        authority: "authored",
        source: ref("process", relationship.processId),
        target: ref("file", relationship.filePath),
        detail: relationship.operation,
      };

    case "service_process":
      return {
        id: relationship.id,
        type: relationship.type,
        authority: "authored",
        source: ref("service", relationship.serviceName),
        target: ref("process", relationship.processId),
      };

    case "process_configuration":
      return {
        id: relationship.id,
        type: relationship.type,
        authority: "authored",
        source: ref("process", relationship.processId),
        target: ref("configuration", relationship.key),
        detail: relationship.purpose,
      };

    case "service_configuration":
      return {
        id: relationship.id,
        type: relationship.type,
        authority: "authored",
        source: ref("service", relationship.serviceName),
        target: ref("configuration", relationship.key),
        detail: relationship.purpose,
      };
  }
}

export function buildSyntheticHostRelationshipGraph(
  host: SyntheticHostState,
  relationships:
    readonly SyntheticHostAuthoredRelationship[] = [],
): readonly SyntheticHostResolvedRelationship[] {
  validateSyntheticHostRelationships(
    host,
    relationships,
  );

  return [
    ...derivedRelationships(host),
    ...relationships.map(
      resolveAuthoredRelationship,
    ),
  ];
}

export function getSyntheticHostRelationshipsForRefs(
  host: SyntheticHostState,
  relationships:
    readonly SyntheticHostAuthoredRelationship[],
  refs: readonly SyntheticHostObjectRef[],
): readonly SyntheticHostResolvedRelationship[] {
  const keys = new Set(
    refs.map(syntheticHostObjectRefKey),
  );

  return buildSyntheticHostRelationshipGraph(
    host,
    relationships,
  ).filter(
    (relationship) =>
      keys.has(
        syntheticHostObjectRefKey(
          relationship.source,
        ),
      ) ||
      keys.has(
        syntheticHostObjectRefKey(
          relationship.target,
        ),
      ),
  );
}

export function getSyntheticHostProcessInvestigation(
  host: SyntheticHostState,
  relationships:
    readonly SyntheticHostAuthoredRelationship[],
  processId: number,
): SyntheticHostProcessInvestigation {
  if (
    !host.processes.some(
      (process) => process.pid === processId,
    )
  ) {
    throw new Error(
      `Synthetic host process not found: ${processId}`,
    );
  }

  const processRef = ref("process", processId);
  const relevant =
    getSyntheticHostRelationshipsForRefs(
      host,
      relationships,
      [processRef],
    );

  return {
    processId,
    relationships: relevant,
    relatedRefs: uniqueRefs([
      processRef,
      ...relevant.flatMap(
        (relationship) => [
          relationship.source,
          relationship.target,
        ],
      ),
    ]),
  };
}

export function getScenarioSyntheticHostRelationships(
  scenario: ScenarioDefinition,
  deviceId: EntityId,
): readonly SyntheticHostAuthoredRelationship[] {
  return scenario.syntheticHostRelationships
    ?.find((set) => set.deviceId === deviceId)
    ?.relationships ?? [];
}
