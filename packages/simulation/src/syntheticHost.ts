import type {
  EntityId,
  SimulationTimestamp,
} from "@polymorph/domain";

import {
  querySyntheticHostActivity,
} from "./syntheticHostActivity";

import type {
  SyntheticHostActivity,
} from "./syntheticHostActivity";

import type {
  SyntheticHostObjectRef,
} from "./syntheticHostRelationship";

import type {
  WorldState,
} from "./worldState";

export const SYNTHETIC_HOST_SERIALIZATION_VERSION = 1;

export type SyntheticHostCapability =
  | "read:filesystem"
  | "read:processes"
  | "read:services"
  | "read:identity"
  | "read:configuration"
  | "read:logs"
  | "read:network"
  | "manage:services"
  | "terminate:process"
  | "quarantine:file";

export interface SyntheticHostFile {
  path: string;
  content: string;
  sha256?: string;
  owner: string;
  group?: string;
  mode?: string;
  createdAt?: SimulationTimestamp;
  modifiedAt?: SimulationTimestamp;
  quarantined: boolean;
  originalPath?: string;
}

export type SyntheticHostProcessState =
  | "running"
  | "terminated";

export interface SyntheticHostProcess {
  pid: number;
  image: string;
  commandLine: string;
  parentPid?: number;
  accountId?: EntityId;
  state: SyntheticHostProcessState;
  startedAt?: SimulationTimestamp;
  terminatedAt?: SimulationTimestamp;
}

export type SyntheticHostServiceStatus =
  | "running"
  | "stopped";

export type SyntheticHostServiceStartupMode =
  | "automatic"
  | "manual"
  | "disabled";

export interface SyntheticHostService {
  name: string;
  executable: string;
  startupMode: SyntheticHostServiceStartupMode;
  status: SyntheticHostServiceStatus;
  account?: string;
}

export interface SyntheticHostLocalUser {
  username: string;
  enabled: boolean;
  groups: readonly string[];
}

export interface SyntheticHostLocalGroup {
  name: string;
  members: readonly string[];
}

export type SyntheticHostConfigValue =
  | string
  | number
  | boolean
  | null;

export interface SyntheticHostLogRecord {
  id: string;
  timestamp: SimulationTimestamp;
  channel: string;
  level: "debug" | "information" | "warning" | "error";
  source: string;
  message: string;
}

export interface SyntheticHostListener {
  id: string;
  protocol: "tcp" | "udp";
  address: string;
  port: number;
  processId?: number;
}

export interface SyntheticHostConnection {
  id: string;
  protocol: "tcp" | "udp";
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: "established" | "closed" | "connecting";
  processId?: number;
}

export interface SyntheticHostNetworkState {
  listeners: readonly SyntheticHostListener[];
  connections: readonly SyntheticHostConnection[];
}

export interface SyntheticHostState {
  deviceId: EntityId;
  capabilities: readonly SyntheticHostCapability[];
  files: readonly SyntheticHostFile[];
  processes: readonly SyntheticHostProcess[];
  services: readonly SyntheticHostService[];
  users: readonly SyntheticHostLocalUser[];
  groups: readonly SyntheticHostLocalGroup[];
  configuration: Readonly<
    Record<string, SyntheticHostConfigValue>
  >;
  logs: readonly SyntheticHostLogRecord[];
  network: SyntheticHostNetworkState;
}

export interface SyntheticHostSeed {
  deviceId: EntityId;
  capabilities?: readonly SyntheticHostCapability[];
  files?: readonly SyntheticHostFile[];
  processes?: readonly SyntheticHostProcess[];
  services?: readonly SyntheticHostService[];
  users?: readonly SyntheticHostLocalUser[];
  groups?: readonly SyntheticHostLocalGroup[];
  configuration?: Readonly<
    Record<string, SyntheticHostConfigValue>
  >;
  logs?: readonly SyntheticHostLogRecord[];
  network?: Partial<SyntheticHostNetworkState>;
}

export type SyntheticHostCommand =
  | {
      type: "list_files";
      prefix?: string;
    }
  | {
      type: "read_file";
      path: string;
    }
  | {
      type: "list_processes";
    }
  | {
      type: "get_process";
      pid: number;
    }
  | {
      type: "list_services";
    }
  | {
      type: "get_service";
      name: string;
    }
  | {
      type: "list_users";
    }
  | {
      type: "list_groups";
    }
  | {
      type: "read_config";
      key: string;
    }
  | {
      type: "list_logs";
      channel?: string;
    }
  | {
      type: "list_network";
    }
  | {
      type: "list_activity";
      objectKind?: SyntheticHostObjectRef["kind"];
      objectId?: string;
    }
  | {
      type: "start_service";
      name: string;
    }
  | {
      type: "stop_service";
      name: string;
    }
  | {
      type: "set_service_startup_mode";
      name: string;
      startupMode: SyntheticHostServiceStartupMode;
    }
  | {
      type: "terminate_process";
      pid: number;
    }
  | {
      type: "quarantine_file";
      path: string;
      destinationPath: string;
    };

export interface SyntheticHostCommandInvocation {
  id: string;
  timestamp: SimulationTimestamp;
  actorId?: EntityId;
  command: SyntheticHostCommand;
}

export type SyntheticHostCommandResult =
  | {
      kind: "files";
      files: readonly SyntheticHostFile[];
    }
  | {
      kind: "file";
      file: SyntheticHostFile;
    }
  | {
      kind: "processes";
      processes: readonly SyntheticHostProcess[];
    }
  | {
      kind: "process";
      process: SyntheticHostProcess;
    }
  | {
      kind: "services";
      services: readonly SyntheticHostService[];
    }
  | {
      kind: "service";
      service: SyntheticHostService;
    }
  | {
      kind: "users";
      users: readonly SyntheticHostLocalUser[];
    }
  | {
      kind: "groups";
      groups: readonly SyntheticHostLocalGroup[];
    }
  | {
      kind: "configuration";
      key: string;
      value: SyntheticHostConfigValue;
    }
  | {
      kind: "logs";
      logs: readonly SyntheticHostLogRecord[];
    }
  | {
      kind: "network";
      network: SyntheticHostNetworkState;
    }
  | {
      kind: "activity";
      filter: SyntheticHostObjectRef | null;
      records: readonly SyntheticHostActivity[];
    }
  | {
      kind: "mutation";
      changed: boolean;
      targetType: "service" | "process" | "file";
      targetId: string;
    };

export interface SyntheticHostAuditRecord {
  id: string;
  timestamp: SimulationTimestamp;
  deviceId: EntityId;
  actorId?: EntityId;
  commandType: SyntheticHostCommand["type"];
  mutation: boolean;
  summary: string;
}

export interface SyntheticHostCommandExecution {
  state: SyntheticHostState;
  result: SyntheticHostCommandResult;
  audit: SyntheticHostAuditRecord;
}

export interface SyntheticHostReplayResult {
  state: SyntheticHostState;
  executions: readonly SyntheticHostCommandExecution[];
}

const ALL_CAPABILITIES:
  readonly SyntheticHostCapability[] = [
    "read:filesystem",
    "read:processes",
    "read:services",
    "read:identity",
    "read:configuration",
    "read:logs",
    "read:network",
    "manage:services",
    "terminate:process",
    "quarantine:file",
  ];

function cloneFile(
  file: SyntheticHostFile,
): SyntheticHostFile {
  return { ...file };
}

function cloneProcess(
  process: SyntheticHostProcess,
): SyntheticHostProcess {
  return { ...process };
}

function cloneService(
  service: SyntheticHostService,
): SyntheticHostService {
  return { ...service };
}

function cloneUser(
  user: SyntheticHostLocalUser,
): SyntheticHostLocalUser {
  return {
    ...user,
    groups: [...user.groups],
  };
}

function cloneGroup(
  group: SyntheticHostLocalGroup,
): SyntheticHostLocalGroup {
  return {
    ...group,
    members: [...group.members],
  };
}

function cloneLog(
  log: SyntheticHostLogRecord,
): SyntheticHostLogRecord {
  return { ...log };
}

function cloneNetwork(
  network: SyntheticHostNetworkState,
): SyntheticHostNetworkState {
  return {
    listeners: network.listeners.map(
      (listener) => ({ ...listener }),
    ),
    connections: network.connections.map(
      (connection) => ({ ...connection }),
    ),
  };
}

function cloneState(
  state: SyntheticHostState,
): SyntheticHostState {
  return {
    deviceId: state.deviceId,
    capabilities: [...state.capabilities],
    files: state.files.map(cloneFile),
    processes:
      state.processes.map(cloneProcess),
    services:
      state.services.map(cloneService),
    users: state.users.map(cloneUser),
    groups: state.groups.map(cloneGroup),
    configuration: {
      ...state.configuration,
    },
    logs: state.logs.map(cloneLog),
    network: cloneNetwork(state.network),
  };
}

function requireNonEmpty(
  value: string,
  label: string,
): void {
  if (value.trim().length === 0) {
    throw new Error(
      `${label} must not be empty.`,
    );
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

function requirePort(
  port: number,
  label: string,
): void {
  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  ) {
    throw new Error(
      `${label} must be an integer between 0 and 65535.`,
    );
  }
}

function requirePid(
  pid: number,
  label: string,
): void {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(
      `${label} must be a positive integer.`,
    );
  }
}

function requireVirtualPath(
  path: string,
  label: string,
): void {
  if (
    !path.startsWith("/") ||
    path.includes("..") ||
    path.includes("//")
  ) {
    throw new Error(
      `${label} must be a normalized absolute synthetic path.`,
    );
  }
}

function requireUnique<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string,
): void {
  const seen = new Set<string>();

  for (const value of values) {
    const candidate = key(value);

    if (seen.has(candidate)) {
      throw new Error(
        `${label} contains duplicate key: ${candidate}`,
      );
    }

    seen.add(candidate);
  }
}

function validateSyntheticHostState(
  state: SyntheticHostState,
  world?: WorldState,
): void {
  requireNonEmpty(
    state.deviceId,
    "Synthetic host deviceId",
  );

  if (
    world &&
    !world.devices[state.deviceId]
  ) {
    throw new Error(
      `Synthetic host references missing device: ${state.deviceId}`,
    );
  }

  requireUnique(
    state.capabilities,
    (capability) => capability,
    "Synthetic host capabilities",
  );

  for (const capability of state.capabilities) {
    if (!ALL_CAPABILITIES.includes(capability)) {
      throw new Error(
        `Synthetic host has unsupported capability: ${capability}`,
      );
    }
  }

  requireUnique(
    state.files,
    (file) => file.path,
    "Synthetic host files",
  );

  for (const file of state.files) {
    requireVirtualPath(
      file.path,
      "Synthetic host file path",
    );
    requireNonEmpty(
      file.owner,
      `Synthetic host file owner for ${file.path}`,
    );

    if (
      file.originalPath !== undefined
    ) {
      requireVirtualPath(
        file.originalPath,
        `Synthetic host original path for ${file.path}`,
      );
    }
  }

  requireUnique(
    state.processes,
    (process) => String(process.pid),
    "Synthetic host processes",
  );

  const processIds = new Set(
    state.processes.map(
      (process) => process.pid,
    ),
  );

  for (const process of state.processes) {
    requirePid(
      process.pid,
      "Synthetic host process pid",
    );
    requireNonEmpty(
      process.image,
      `Synthetic host process image for ${process.pid}`,
    );

    if (
      process.parentPid !== undefined &&
      !processIds.has(process.parentPid)
    ) {
      throw new Error(
        `Synthetic host process ${process.pid} references missing parent pid: ${process.parentPid}`,
      );
    }

    if (
      process.startedAt !== undefined
    ) {
      requireTimestamp(
        process.startedAt,
        `Synthetic host process ${process.pid} startedAt`,
      );
    }

    if (
      process.terminatedAt !== undefined
    ) {
      requireTimestamp(
        process.terminatedAt,
        `Synthetic host process ${process.pid} terminatedAt`,
      );
    }
  }

  requireUnique(
    state.services,
    (service) => service.name,
    "Synthetic host services",
  );

  for (const service of state.services) {
    requireNonEmpty(
      service.name,
      "Synthetic host service name",
    );
    requireNonEmpty(
      service.executable,
      `Synthetic host service executable for ${service.name}`,
    );
  }

  requireUnique(
    state.users,
    (user) => user.username,
    "Synthetic host users",
  );
  requireUnique(
    state.groups,
    (group) => group.name,
    "Synthetic host groups",
  );

  const groupNames = new Set(
    state.groups.map((group) => group.name),
  );

  for (const user of state.users) {
    requireNonEmpty(
      user.username,
      "Synthetic host username",
    );

    for (const groupName of user.groups) {
      if (!groupNames.has(groupName)) {
        throw new Error(
          `Synthetic host user ${user.username} references missing group: ${groupName}`,
        );
      }
    }
  }

  for (const group of state.groups) {
    requireNonEmpty(
      group.name,
      "Synthetic host group name",
    );
  }

  requireUnique(
    state.logs,
    (log) => log.id,
    "Synthetic host logs",
  );

  for (const log of state.logs) {
    requireTimestamp(
      log.timestamp,
      `Synthetic host log ${log.id} timestamp`,
    );
    requireNonEmpty(
      log.channel,
      `Synthetic host log ${log.id} channel`,
    );
  }

  requireUnique(
    state.network.listeners,
    (listener) => listener.id,
    "Synthetic host listeners",
  );
  requireUnique(
    state.network.connections,
    (connection) => connection.id,
    "Synthetic host connections",
  );

  for (const listener of state.network.listeners) {
    requirePort(
      listener.port,
      `Synthetic host listener ${listener.id} port`,
    );

    if (
      listener.processId !== undefined &&
      !processIds.has(listener.processId)
    ) {
      throw new Error(
        `Synthetic host listener ${listener.id} references missing process pid: ${listener.processId}`,
      );
    }
  }

  for (const connection of state.network.connections) {
    requirePort(
      connection.localPort,
      `Synthetic host connection ${connection.id} localPort`,
    );
    requirePort(
      connection.remotePort,
      `Synthetic host connection ${connection.id} remotePort`,
    );

    if (
      connection.processId !== undefined &&
      !processIds.has(connection.processId)
    ) {
      throw new Error(
        `Synthetic host connection ${connection.id} references missing process pid: ${connection.processId}`,
      );
    }
  }
}

export function createSyntheticHostState(
  seed: SyntheticHostSeed,
  world?: WorldState,
): SyntheticHostState {
  const state: SyntheticHostState = {
    deviceId: seed.deviceId,
    capabilities: [
      ...(seed.capabilities ?? []),
    ],
    files: (seed.files ?? []).map(
      cloneFile,
    ),
    processes: (seed.processes ?? []).map(
      cloneProcess,
    ),
    services: (seed.services ?? []).map(
      cloneService,
    ),
    users: (seed.users ?? []).map(
      cloneUser,
    ),
    groups: (seed.groups ?? []).map(
      cloneGroup,
    ),
    configuration: {
      ...(seed.configuration ?? {}),
    },
    logs: (seed.logs ?? []).map(
      cloneLog,
    ),
    network: {
      listeners: (
        seed.network?.listeners ?? []
      ).map((listener) => ({
        ...listener,
      })),
      connections: (
        seed.network?.connections ?? []
      ).map((connection) => ({
        ...connection,
      })),
    },
  };

  validateSyntheticHostState(
    state,
    world,
  );

  return state;
}

export function resetSyntheticHostState(
  seed: SyntheticHostSeed,
  world?: WorldState,
): SyntheticHostState {
  return createSyntheticHostState(
    seed,
    world,
  );
}

function requireCapability(
  state: SyntheticHostState,
  capability: SyntheticHostCapability,
): void {
  if (
    !state.capabilities.includes(capability)
  ) {
    throw new Error(
      `Synthetic host ${state.deviceId} does not permit capability: ${capability}`,
    );
  }
}

function requireInvocation(
  invocation: SyntheticHostCommandInvocation,
): void {
  requireNonEmpty(
    invocation.id,
    "Synthetic host command id",
  );
  requireTimestamp(
    invocation.timestamp,
    `Synthetic host command ${invocation.id} timestamp`,
  );
}

function requireFile(
  state: SyntheticHostState,
  path: string,
): SyntheticHostFile {
  requireVirtualPath(
    path,
    "Synthetic host command path",
  );

  const file = state.files.find(
    (candidate) => candidate.path === path,
  );

  if (!file) {
    throw new Error(
      `Synthetic host file not found: ${path}`,
    );
  }

  return file;
}

function requireProcess(
  state: SyntheticHostState,
  pid: number,
): SyntheticHostProcess {
  requirePid(
    pid,
    "Synthetic host command pid",
  );

  const process = state.processes.find(
    (candidate) => candidate.pid === pid,
  );

  if (!process) {
    throw new Error(
      `Synthetic host process not found: ${pid}`,
    );
  }

  return process;
}

function requireService(
  state: SyntheticHostState,
  name: string,
): SyntheticHostService {
  requireNonEmpty(
    name,
    "Synthetic host service name",
  );

  const service = state.services.find(
    (candidate) => candidate.name === name,
  );

  if (!service) {
    throw new Error(
      `Synthetic host service not found: ${name}`,
    );
  }

  return service;
}

function audit(
  state: SyntheticHostState,
  invocation: SyntheticHostCommandInvocation,
  mutation: boolean,
  summary: string,
): SyntheticHostAuditRecord {
  return {
    id: invocation.id,
    timestamp: invocation.timestamp,
    deviceId: state.deviceId,
    ...(invocation.actorId === undefined
      ? {}
      : { actorId: invocation.actorId }),
    commandType: invocation.command.type,
    mutation,
    summary,
  };
}

function execution(
  state: SyntheticHostState,
  invocation: SyntheticHostCommandInvocation,
  result: SyntheticHostCommandResult,
  mutation: boolean,
  summary: string,
): SyntheticHostCommandExecution {
  return {
    state,
    result,
    audit: audit(
      state,
      invocation,
      mutation,
      summary,
    ),
  };
}

export function executeSyntheticHostCommand(
  state: SyntheticHostState,
  invocation: SyntheticHostCommandInvocation,
  activityRecords:
    readonly SyntheticHostActivity[] = [],
): SyntheticHostCommandExecution {
  requireInvocation(invocation);

  const command = invocation.command;

  switch (command.type) {
    case "list_files": {
      requireCapability(
        state,
        "read:filesystem",
      );

      if (command.prefix !== undefined) {
        requireVirtualPath(
          command.prefix,
          "Synthetic host file prefix",
        );
      }

      const files = state.files
        .filter(
          (file) =>
            command.prefix === undefined ||
            file.path.startsWith(command.prefix),
        )
        .map(cloneFile)
        .sort((left, right) =>
          left.path.localeCompare(right.path),
        );

      return execution(
        state,
        invocation,
        { kind: "files", files },
        false,
        `Listed ${files.length} synthetic host file(s).`,
      );
    }

    case "read_file": {
      requireCapability(
        state,
        "read:filesystem",
      );
      const file = cloneFile(
        requireFile(state, command.path),
      );

      return execution(
        state,
        invocation,
        { kind: "file", file },
        false,
        `Read synthetic host file ${command.path}.`,
      );
    }

    case "list_processes": {
      requireCapability(
        state,
        "read:processes",
      );
      const processes = state.processes
        .map(cloneProcess)
        .sort(
          (left, right) =>
            left.pid - right.pid,
        );

      return execution(
        state,
        invocation,
        { kind: "processes", processes },
        false,
        `Listed ${processes.length} synthetic host process(es).`,
      );
    }

    case "get_process": {
      requireCapability(
        state,
        "read:processes",
      );
      const process = cloneProcess(
        requireProcess(state, command.pid),
      );

      return execution(
        state,
        invocation,
        { kind: "process", process },
        false,
        `Read synthetic host process ${command.pid}.`,
      );
    }

    case "list_services": {
      requireCapability(
        state,
        "read:services",
      );
      const services = state.services
        .map(cloneService)
        .sort((left, right) =>
          left.name.localeCompare(right.name),
        );

      return execution(
        state,
        invocation,
        { kind: "services", services },
        false,
        `Listed ${services.length} synthetic host service(s).`,
      );
    }

    case "get_service": {
      requireCapability(
        state,
        "read:services",
      );
      const service = cloneService(
        requireService(state, command.name),
      );

      return execution(
        state,
        invocation,
        { kind: "service", service },
        false,
        `Read synthetic host service ${command.name}.`,
      );
    }

    case "list_users": {
      requireCapability(
        state,
        "read:identity",
      );
      const users = state.users
        .map(cloneUser)
        .sort((left, right) =>
          left.username.localeCompare(
            right.username,
          ),
        );

      return execution(
        state,
        invocation,
        { kind: "users", users },
        false,
        `Listed ${users.length} synthetic host user(s).`,
      );
    }

    case "list_groups": {
      requireCapability(
        state,
        "read:identity",
      );
      const groups = state.groups
        .map(cloneGroup)
        .sort((left, right) =>
          left.name.localeCompare(right.name),
        );

      return execution(
        state,
        invocation,
        { kind: "groups", groups },
        false,
        `Listed ${groups.length} synthetic host group(s).`,
      );
    }

    case "read_config": {
      requireCapability(
        state,
        "read:configuration",
      );
      requireNonEmpty(
        command.key,
        "Synthetic host configuration key",
      );

      if (
        !Object.prototype.hasOwnProperty.call(
          state.configuration,
          command.key,
        )
      ) {
        throw new Error(
          `Synthetic host configuration key not found: ${command.key}`,
        );
      }

      return execution(
        state,
        invocation,
        {
          kind: "configuration",
          key: command.key,
          value:
            state.configuration[command.key] ?? null,
        },
        false,
        `Read synthetic host configuration ${command.key}.`,
      );
    }

    case "list_logs": {
      requireCapability(
        state,
        "read:logs",
      );
      const logs = state.logs
        .filter(
          (record) =>
            command.channel === undefined ||
            record.channel === command.channel,
        )
        .map(cloneLog)
        .sort((left, right) => {
          const timestampOrder =
            left.timestamp.localeCompare(
              right.timestamp,
            );

          return timestampOrder === 0
            ? left.id.localeCompare(right.id)
            : timestampOrder;
        });

      return execution(
        state,
        invocation,
        { kind: "logs", logs },
        false,
        `Listed ${logs.length} synthetic host log record(s).`,
      );
    }

    case "list_network": {
      requireCapability(
        state,
        "read:network",
      );

      return execution(
        state,
        invocation,
        {
          kind: "network",
          network: cloneNetwork(
            state.network,
          ),
        },
        false,
        "Listed synthetic host network state.",
      );
    }

    case "list_activity": {
      const hasKind =
        command.objectKind !== undefined;
      const hasId =
        command.objectId !== undefined;

      if (hasKind !== hasId) {
        throw new Error(
          "Synthetic host history filter requires both object kind and object id.",
        );
      }

      if (command.objectId !== undefined) {
        requireNonEmpty(
          command.objectId,
          "Synthetic host history object id",
        );
      }

      const filter:
        SyntheticHostObjectRef | null =
        command.objectKind !== undefined &&
        command.objectId !== undefined
          ? {
              kind: command.objectKind,
              id: command.objectId,
            }
          : null;
      const records =
        querySyntheticHostActivity(
          activityRecords,
          filter === null
            ? {}
            : { ref: filter },
        );

      return execution(
        state,
        invocation,
        {
          kind: "activity",
          filter,
          records,
        },
        false,
        `Listed ${records.length} synthetic host activity record(s)${filter === null ? "" : ` for ${filter.kind}:${filter.id}`}.`,
      );
    }

    case "start_service":
    case "stop_service": {
      requireCapability(
        state,
        "manage:services",
      );
      const service = requireService(
        state,
        command.name,
      );
      const targetStatus:
        SyntheticHostServiceStatus =
        command.type === "start_service"
          ? "running"
          : "stopped";
      const changed =
        service.status !== targetStatus;
      const nextState = changed
        ? {
            ...state,
            services: state.services.map(
              (candidate) =>
                candidate.name === command.name
                  ? {
                      ...candidate,
                      status: targetStatus,
                    }
                  : candidate,
            ),
          }
        : state;

      return execution(
        nextState,
        invocation,
        {
          kind: "mutation",
          changed,
          targetType: "service",
          targetId: command.name,
        },
        true,
        `${command.type === "start_service" ? "Started" : "Stopped"} synthetic host service ${command.name}.`,
      );
    }

    case "set_service_startup_mode": {
      requireCapability(
        state,
        "manage:services",
      );
      const service = requireService(
        state,
        command.name,
      );
      const changed =
        service.startupMode !== command.startupMode;
      const nextState = changed
        ? {
            ...state,
            services: state.services.map(
              (candidate) =>
                candidate.name === command.name
                  ? {
                      ...candidate,
                      startupMode: command.startupMode,
                    }
                  : candidate,
            ),
          }
        : state;

      return execution(
        nextState,
        invocation,
        {
          kind: "mutation",
          changed,
          targetType: "service",
          targetId: command.name,
        },
        true,
        `Changed synthetic host service ${command.name} startup mode ${service.startupMode} -> ${command.startupMode}.`,
      );
    }

    case "terminate_process": {
      requireCapability(
        state,
        "terminate:process",
      );
      const process = requireProcess(
        state,
        command.pid,
      );
      const changed =
        process.state !== "terminated";
      const nextState = changed
        ? {
            ...state,
            processes: state.processes.map(
              (candidate) =>
                candidate.pid === command.pid
                  ? {
                      ...candidate,
                      state: "terminated" as const,
                      terminatedAt:
                        invocation.timestamp,
                    }
                  : candidate,
            ),
          }
        : state;

      return execution(
        nextState,
        invocation,
        {
          kind: "mutation",
          changed,
          targetType: "process",
          targetId: String(command.pid),
        },
        true,
        `Terminated synthetic host process ${command.pid}.`,
      );
    }

    case "quarantine_file": {
      requireCapability(
        state,
        "quarantine:file",
      );
      const file = requireFile(
        state,
        command.path,
      );
      requireVirtualPath(
        command.destinationPath,
        "Synthetic host quarantine destination",
      );

      if (
        command.destinationPath !== command.path &&
        state.files.some(
          (candidate) =>
            candidate.path ===
            command.destinationPath,
        )
      ) {
        throw new Error(
          `Synthetic host quarantine destination already exists: ${command.destinationPath}`,
        );
      }

      const changed =
        !file.quarantined ||
        file.path !== command.destinationPath;
      const nextState = changed
        ? {
            ...state,
            files: state.files.map(
              (candidate) =>
                candidate.path === command.path
                  ? {
                      ...candidate,
                      path:
                        command.destinationPath,
                      quarantined: true,
                      originalPath:
                        candidate.originalPath ??
                        candidate.path,
                      modifiedAt:
                        invocation.timestamp,
                    }
                  : candidate,
            ),
          }
        : state;

      return execution(
        nextState,
        invocation,
        {
          kind: "mutation",
          changed,
          targetType: "file",
          targetId: command.destinationPath,
        },
        true,
        `Quarantined synthetic host file ${command.path} to ${command.destinationPath}.`,
      );
    }
  }
}

export function replaySyntheticHostCommands(
  initialState: SyntheticHostState,
  invocations:
    readonly SyntheticHostCommandInvocation[],
  activityRecords:
    readonly SyntheticHostActivity[] = [],
): SyntheticHostReplayResult {
  let state = cloneState(initialState);
  const executions:
    SyntheticHostCommandExecution[] = [];
  const invocationIds = new Set<string>();
  let previousTimestamp: string | undefined;

  for (const invocation of invocations) {
    if (invocationIds.has(invocation.id)) {
      throw new Error(
        `Synthetic host command id already exists in replay: ${invocation.id}`,
      );
    }

    if (
      previousTimestamp !== undefined &&
      invocation.timestamp < previousTimestamp
    ) {
      throw new Error(
        `Synthetic host command timestamp regressed at ${invocation.id}.`,
      );
    }

    invocationIds.add(invocation.id);
    previousTimestamp = invocation.timestamp;

    const result =
      executeSyntheticHostCommand(
        state,
        invocation,
        activityRecords,
      );
    state = result.state;
    executions.push(result);
  }

  return {
    state,
    executions,
  };
}

interface SyntheticHostSerializationEnvelope {
  version: number;
  kind: "synthetic-host";
  payload: SyntheticHostState;
}

export function serializeSyntheticHostState(
  state: SyntheticHostState,
): string {
  validateSyntheticHostState(state);

  const envelope:
    SyntheticHostSerializationEnvelope = {
      version:
        SYNTHETIC_HOST_SERIALIZATION_VERSION,
      kind: "synthetic-host",
      payload: cloneState(state),
    };

  return JSON.stringify(envelope);
}

export function deserializeSyntheticHostState(
  serialized: string,
  world?: WorldState,
): SyntheticHostState {
  const parsed = JSON.parse(
    serialized,
  ) as Partial<SyntheticHostSerializationEnvelope>;

  if (
    parsed.version !==
    SYNTHETIC_HOST_SERIALIZATION_VERSION
  ) {
    throw new Error(
      `Unsupported synthetic host serialization version: ${String(parsed.version)}`,
    );
  }

  if (parsed.kind !== "synthetic-host") {
    throw new Error(
      `Unsupported synthetic host serialization kind: ${String(parsed.kind)}`,
    );
  }

  if (!parsed.payload) {
    throw new Error(
      "Synthetic host serialization payload is missing.",
    );
  }

  const state = cloneState(
    parsed.payload,
  );
  validateSyntheticHostState(
    state,
    world,
  );

  return state;
}
