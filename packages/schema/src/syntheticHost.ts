import { z } from "zod";

const nonEmptyString = z.string().min(1);
const timestamp = nonEmptyString.refine(
  (value) => Number.isFinite(Date.parse(value)),
  { message: "Expected a valid timestamp." },
);
const virtualPath = nonEmptyString.refine(
  (value) =>
    value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("//"),
  {
    message:
      "Expected a normalized absolute synthetic path.",
  },
);
const port = z.number().int().min(0).max(65535);
const pid = z.number().int().positive();
const serviceStartupMode = z.enum([
  "automatic",
  "manual",
  "disabled",
]);

export const syntheticHostCapabilitySchema = z.enum([
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
]);

export const syntheticHostFileSchema = z.object({
  path: virtualPath,
  content: z.string(),
  sha256: nonEmptyString.optional(),
  owner: nonEmptyString,
  group: nonEmptyString.optional(),
  mode: nonEmptyString.optional(),
  createdAt: timestamp.optional(),
  modifiedAt: timestamp.optional(),
  quarantined: z.boolean().default(false),
  originalPath: virtualPath.optional(),
}).strict();

export const syntheticHostProcessSchema = z.object({
  pid,
  image: nonEmptyString,
  commandLine: z.string(),
  parentPid: pid.optional(),
  accountId: nonEmptyString.optional(),
  state: z.enum([
    "running",
    "terminated",
  ]),
  startedAt: timestamp.optional(),
  terminatedAt: timestamp.optional(),
}).strict();

export const syntheticHostServiceSchema = z.object({
  name: nonEmptyString,
  executable: nonEmptyString,
  startupMode: serviceStartupMode,
  status: z.enum([
    "running",
    "stopped",
  ]),
  account: nonEmptyString.optional(),
}).strict();

export const syntheticHostLocalUserSchema = z.object({
  username: nonEmptyString,
  enabled: z.boolean(),
  groups: z.array(nonEmptyString),
}).strict();

export const syntheticHostLocalGroupSchema = z.object({
  name: nonEmptyString,
  members: z.array(nonEmptyString),
}).strict();

export const syntheticHostConfigValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const syntheticHostLogRecordSchema = z.object({
  id: nonEmptyString,
  timestamp,
  channel: nonEmptyString,
  level: z.enum([
    "debug",
    "information",
    "warning",
    "error",
  ]),
  source: nonEmptyString,
  message: z.string(),
}).strict();

export const syntheticHostListenerSchema = z.object({
  id: nonEmptyString,
  protocol: z.enum(["tcp", "udp"]),
  address: nonEmptyString,
  port,
  processId: pid.optional(),
}).strict();

export const syntheticHostConnectionSchema = z.object({
  id: nonEmptyString,
  protocol: z.enum(["tcp", "udp"]),
  localAddress: nonEmptyString,
  localPort: port,
  remoteAddress: nonEmptyString,
  remotePort: port,
  state: z.enum([
    "established",
    "closed",
    "connecting",
  ]),
  processId: pid.optional(),
}).strict();

const syntheticHostConfigurationPurposeSchema = z.enum([
  "persistence",
  "execution",
  "policy",
  "startup",
  "other",
]);

export const syntheticHostRelationshipSchema =
  z.discriminatedUnion("type", [
    z.object({
      id: nonEmptyString,
      type: z.literal("process_file"),
      processId: pid,
      filePath: virtualPath,
      operation: z.enum([
        "read",
        "write",
        "create",
        "delete",
        "execute",
      ]),
    }).strict(),
    z.object({
      id: nonEmptyString,
      type: z.literal("service_process"),
      serviceName: nonEmptyString,
      processId: pid,
    }).strict(),
    z.object({
      id: nonEmptyString,
      type: z.literal("process_configuration"),
      processId: pid,
      key: nonEmptyString,
      purpose:
        syntheticHostConfigurationPurposeSchema,
    }).strict(),
    z.object({
      id: nonEmptyString,
      type: z.literal("service_configuration"),
      serviceName: nonEmptyString,
      key: nonEmptyString,
      purpose:
        syntheticHostConfigurationPurposeSchema,
    }).strict(),
  ]);

const syntheticHostActivityBase = {
  id: nonEmptyString,
  timestamp,
} as const;

export const syntheticHostActivitySchema =
  z.discriminatedUnion("type", [
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("process_started"),
      processId: pid,
    }).strict(),
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("process_terminated"),
      processId: pid,
    }).strict(),
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("file_activity"),
      filePath: virtualPath,
      operation: z.enum([
        "read",
        "write",
        "create",
        "delete",
        "execute",
      ]),
      processId: pid.optional(),
    }).strict(),
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("service_state"),
      serviceName: nonEmptyString,
      status: z.enum(["running", "stopped"]),
    }).strict(),
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("service_startup_mode"),
      serviceName: nonEmptyString,
      previousStartupMode: serviceStartupMode,
      startupMode: serviceStartupMode,
    }).strict(),
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("configuration_change"),
      key: nonEmptyString,
      value: syntheticHostConfigValueSchema,
      previousValue:
        syntheticHostConfigValueSchema.optional(),
      processId: pid.optional(),
      serviceName: nonEmptyString.optional(),
    }).strict(),
    z.object({
      ...syntheticHostActivityBase,
      type: z.literal("network_connection"),
      connectionId: nonEmptyString,
      action: z.enum(["opened", "closed"]),
      processId: pid.optional(),
    }).strict(),
  ]);

export const syntheticHostScenarioSchema = z.object({
  deviceId: nonEmptyString,
  capabilities:
    z.array(syntheticHostCapabilitySchema)
      .default([]),
  files:
    z.array(syntheticHostFileSchema)
      .default([]),
  processes:
    z.array(syntheticHostProcessSchema)
      .default([]),
  services:
    z.array(syntheticHostServiceSchema)
      .default([]),
  users:
    z.array(syntheticHostLocalUserSchema)
      .default([]),
  groups:
    z.array(syntheticHostLocalGroupSchema)
      .default([]),
  configuration:
    z.record(
      z.string(),
      syntheticHostConfigValueSchema,
    ).default({}),
  logs:
    z.array(syntheticHostLogRecordSchema)
      .default([]),
  network: z.object({
    listeners:
      z.array(syntheticHostListenerSchema)
        .default([]),
    connections:
      z.array(syntheticHostConnectionSchema)
        .default([]),
  }).strict().default({
    listeners: [],
    connections: [],
  }),
  relationships:
    z.array(syntheticHostRelationshipSchema)
      .default([]),
  activity:
    z.array(syntheticHostActivitySchema)
      .default([]),
}).strict();

export type SyntheticHostScenarioSpec =
  z.infer<typeof syntheticHostScenarioSchema>;
