import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import type {
  SyntheticHostConfigValue,
  SyntheticHostServiceStatus,
  SyntheticHostState,
} from "./syntheticHost";

import {
  syntheticHostObjectRefKey,
} from "./syntheticHostRelationship";

import type {
  SyntheticHostFileOperation,
  SyntheticHostObjectRef,
} from "./syntheticHostRelationship";

export type SyntheticHostNetworkActivityAction =
  | "opened"
  | "closed";

interface SyntheticHostActivityBase {
  id: string;
  timestamp: SimulationTimestamp;
}

export type SyntheticHostActivity =
  | (
      SyntheticHostActivityBase & {
        type: "process_started";
        processId: number;
      }
    )
  | (
      SyntheticHostActivityBase & {
        type: "process_terminated";
        processId: number;
      }
    )
  | (
      SyntheticHostActivityBase & {
        type: "file_activity";
        filePath: string;
        operation: SyntheticHostFileOperation;
        processId?: number;
      }
    )
  | (
      SyntheticHostActivityBase & {
        type: "service_state";
        serviceName: string;
        status: SyntheticHostServiceStatus;
      }
    )
  | (
      SyntheticHostActivityBase & {
        type: "configuration_change";
        key: string;
        value: SyntheticHostConfigValue;
        previousValue?: SyntheticHostConfigValue;
        processId?: number;
        serviceName?: string;
      }
    )
  | (
      SyntheticHostActivityBase & {
        type: "network_connection";
        connectionId: string;
        action: SyntheticHostNetworkActivityAction;
        processId?: number;
      }
    );

export interface SyntheticHostActivitySet {
  deviceId: EntityId;
  records: readonly SyntheticHostActivity[];
}

export interface SyntheticHostActivityQuery {
  ref?: SyntheticHostObjectRef;
}

export interface SyntheticHostActivityTimeRange {
  startAt: SimulationTimestamp | null;
  endAt: SimulationTimestamp | null;
}

declare module "./scenario" {
  interface ScenarioDefinition {
    syntheticHostActivity?:
      readonly SyntheticHostActivitySet[];
  }
}

function requireNonEmpty(
  value: string,
  label: string,
): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function requireTimestamp(
  value: string,
  label: string,
): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(
      `${label} must be a valid timestamp.`,
    );
  }
}

function ref(
  kind: SyntheticHostObjectRef["kind"],
  id: string | number,
): SyntheticHostObjectRef {
  return {
    kind,
    id: String(id),
  };
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

export function getSyntheticHostActivityRefs(
  record: SyntheticHostActivity,
): readonly SyntheticHostObjectRef[] {
  switch (record.type) {
    case "process_started":
    case "process_terminated":
      return [ref("process", record.processId)];

    case "file_activity":
      return uniqueRefs([
        ref("file", record.filePath),
        ...(record.processId === undefined
          ? []
          : [ref("process", record.processId)]),
      ]);

    case "service_state":
      return [ref("service", record.serviceName)];

    case "configuration_change":
      return uniqueRefs([
        ref("configuration", record.key),
        ...(record.processId === undefined
          ? []
          : [ref("process", record.processId)]),
        ...(record.serviceName === undefined
          ? []
          : [ref("service", record.serviceName)]),
      ]);

    case "network_connection":
      return uniqueRefs([
        ref("connection", record.connectionId),
        ...(record.processId === undefined
          ? []
          : [ref("process", record.processId)]),
      ]);
  }
}

export function sortSyntheticHostActivity(
  records: readonly SyntheticHostActivity[],
): readonly SyntheticHostActivity[] {
  const cloned: SyntheticHostActivity[] =
    structuredClone([...records]);

  return cloned.sort((left, right) => {
    const timestamp = left.timestamp.localeCompare(
      right.timestamp,
    );

    return timestamp !== 0
      ? timestamp
      : left.id.localeCompare(right.id);
  });
}

export function validateSyntheticHostActivity(
  host: SyntheticHostState,
  records: readonly SyntheticHostActivity[],
): void {
  const ids = new Set<string>();
  const processIds = new Set(
    host.processes.map((process) => process.pid),
  );
  const filePaths = new Set(
    host.files.flatMap((file) => [
      file.path,
      ...(file.originalPath === undefined
        ? []
        : [file.originalPath]),
    ]),
  );
  const serviceNames = new Set(
    host.services.map((service) => service.name),
  );
  const configurationKeys = new Set(
    Object.keys(host.configuration),
  );
  const connectionById = new Map(
    host.network.connections.map((connection) => [
      connection.id,
      connection,
    ]),
  );

  for (const record of records) {
    requireNonEmpty(
      record.id,
      "Synthetic host activity id",
    );
    requireTimestamp(
      record.timestamp,
      `Synthetic host activity ${record.id} timestamp`,
    );

    if (ids.has(record.id)) {
      throw new Error(
        `Synthetic host activity contains duplicate id: ${record.id}`,
      );
    }
    ids.add(record.id);

    switch (record.type) {
      case "process_started":
      case "process_terminated":
        if (!processIds.has(record.processId)) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing process pid: ${record.processId}`,
          );
        }
        break;

      case "file_activity":
        if (!filePaths.has(record.filePath)) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing file: ${record.filePath}`,
          );
        }
        if (
          record.processId !== undefined &&
          !processIds.has(record.processId)
        ) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing process pid: ${record.processId}`,
          );
        }
        break;

      case "service_state":
        if (!serviceNames.has(record.serviceName)) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing service: ${record.serviceName}`,
          );
        }
        break;

      case "configuration_change":
        if (!configurationKeys.has(record.key)) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing configuration key: ${record.key}`,
          );
        }
        if (
          record.processId !== undefined &&
          !processIds.has(record.processId)
        ) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing process pid: ${record.processId}`,
          );
        }
        if (
          record.serviceName !== undefined &&
          !serviceNames.has(record.serviceName)
        ) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing service: ${record.serviceName}`,
          );
        }
        break;

      case "network_connection": {
        const connection = connectionById.get(
          record.connectionId,
        );

        if (!connection) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing connection: ${record.connectionId}`,
          );
        }
        if (
          record.processId !== undefined &&
          !processIds.has(record.processId)
        ) {
          throw new Error(
            `Synthetic host activity ${record.id} references missing process pid: ${record.processId}`,
          );
        }
        if (
          record.processId !== undefined &&
          connection.processId !== undefined &&
          connection.processId !== record.processId
        ) {
          throw new Error(
            `Synthetic host activity ${record.id} process ${record.processId} does not own connection ${record.connectionId}.`,
          );
        }
        break;
      }
    }
  }
}

export function querySyntheticHostActivity(
  records: readonly SyntheticHostActivity[],
  query: SyntheticHostActivityQuery = {},
): readonly SyntheticHostActivity[] {
  const filterKey = query.ref
    ? syntheticHostObjectRefKey(query.ref)
    : null;

  return sortSyntheticHostActivity(
    records.filter((record) =>
      filterKey === null
        ? true
        : getSyntheticHostActivityRefs(record).some(
            (candidate) =>
              syntheticHostObjectRefKey(candidate) ===
              filterKey,
          ),
    ),
  );
}

export function getSyntheticHostActivityTimeRange(
  records: readonly SyntheticHostActivity[],
): SyntheticHostActivityTimeRange {
  const sorted = sortSyntheticHostActivity(records);

  return {
    startAt: sorted.at(0)?.timestamp ?? null,
    endAt: sorted.at(-1)?.timestamp ?? null,
  };
}

export function summarizeSyntheticHostActivity(
  record: SyntheticHostActivity,
): string {
  switch (record.type) {
    case "process_started":
      return `Process ${record.processId} started`;
    case "process_terminated":
      return `Process ${record.processId} terminated`;
    case "file_activity":
      return `${record.operation} ${record.filePath}${record.processId === undefined ? "" : ` by process ${record.processId}`}`;
    case "service_state":
      return `Service ${record.serviceName} became ${record.status}`;
    case "configuration_change":
      return `Configuration ${record.key} changed`;
    case "network_connection":
      return `Connection ${record.connectionId} ${record.action}`;
  }
}
