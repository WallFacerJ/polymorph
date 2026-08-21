import type {
  SyntheticHostCommand,
  SyntheticHostObjectKind,
} from "./simulationAdapter";

export type RangeParsedCommand =
  | {
      kind: "help";
    }
  | {
      kind: "runtime";
      command: SyntheticHostCommand;
    };

export const RANGE_COMMAND_HELP = [
  "help",
  "ls [prefix]",
  "cat <path>",
  "ps",
  "services",
  "users",
  "groups",
  "config <key>",
  "logs [channel]",
  "net",
  "history [process|file|service|configuration|connection <id>]",
  "stop-service <name>",
  "start-service <name>",
  "set-startup <name> <automatic|manual|disabled>",
  "kill <pid>",
  "quarantine <path> <destination>",
] as const;

const HISTORY_OBJECT_KINDS = new Set<
  SyntheticHostObjectKind
>([
  "process",
  "file",
  "service",
  "configuration",
  "connection",
]);

const SERVICE_STARTUP_MODES = [
  "automatic",
  "manual",
  "disabled",
] as const;

type ServiceStartupMode =
  (typeof SERVICE_STARTUP_MODES)[number];

function isServiceStartupMode(
  value: string,
): value is ServiceStartupMode {
  return SERVICE_STARTUP_MODES.some(
    (candidate) => candidate === value,
  );
}

function tokenize(
  input: string,
): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;

  for (const character of input.trim()) {
    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (
      character === "\"" ||
      character === "'"
    ) {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (quote) {
    throw new Error(
      "Range command contains an unterminated quote.",
    );
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function requireArgument(
  value: string | undefined,
  usage: string,
): string {
  if (value !== undefined) {
    return value;
  }

  throw new Error(
    `Range command usage: ${usage}`,
  );
}

function requireNoExtraArgs(
  args: readonly string[],
  expected: number,
  usage: string,
): void {
  if (args.length === expected) {
    return;
  }

  throw new Error(
    `Range command usage: ${usage}`,
  );
}

export function parseRangeCommand(
  input: string,
): RangeParsedCommand {
  const tokens = tokenize(input);
  const [name, ...args] = tokens;

  if (!name) {
    throw new Error(
      "Enter a Range command.",
    );
  }

  switch (name.toLowerCase()) {
    case "help":
      requireNoExtraArgs(args, 0, "help");
      return { kind: "help" };

    case "ls":
      if (args.length > 1) {
        throw new Error(
          "Range command usage: ls [prefix]",
        );
      }
      return {
        kind: "runtime",
        command: {
          type: "list_files",
          ...(args[0] === undefined
            ? {}
            : { prefix: args[0] }),
        },
      };

    case "cat":
      requireNoExtraArgs(args, 1, "cat <path>");
      return {
        kind: "runtime",
        command: {
          type: "read_file",
          path: requireArgument(
            args[0],
            "cat <path>",
          ),
        },
      };

    case "ps":
      requireNoExtraArgs(args, 0, "ps");
      return {
        kind: "runtime",
        command: {
          type: "list_processes",
        },
      };

    case "services":
      requireNoExtraArgs(args, 0, "services");
      return {
        kind: "runtime",
        command: {
          type: "list_services",
        },
      };

    case "users":
      requireNoExtraArgs(args, 0, "users");
      return {
        kind: "runtime",
        command: {
          type: "list_users",
        },
      };

    case "groups":
      requireNoExtraArgs(args, 0, "groups");
      return {
        kind: "runtime",
        command: {
          type: "list_groups",
        },
      };

    case "config":
      requireNoExtraArgs(args, 1, "config <key>");
      return {
        kind: "runtime",
        command: {
          type: "read_config",
          key: requireArgument(
            args[0],
            "config <key>",
          ),
        },
      };

    case "logs":
      if (args.length > 1) {
        throw new Error(
          "Range command usage: logs [channel]",
        );
      }
      return {
        kind: "runtime",
        command: {
          type: "list_logs",
          ...(args[0] === undefined
            ? {}
            : { channel: args[0] }),
        },
      };

    case "net":
      requireNoExtraArgs(args, 0, "net");
      return {
        kind: "runtime",
        command: {
          type: "list_network",
        },
      };

    case "history": {
      if (args.length === 0) {
        return {
          kind: "runtime",
          command: {
            type: "list_activity",
          },
        };
      }

      requireNoExtraArgs(
        args,
        2,
        "history [process|file|service|configuration|connection <id>]",
      );
      const rawKind = requireArgument(
        args[0],
        "history [process|file|service|configuration|connection <id>]",
      ) as SyntheticHostObjectKind;

      if (!HISTORY_OBJECT_KINDS.has(rawKind)) {
        throw new Error(
          `Range history does not support object kind: ${rawKind}.`,
        );
      }

      return {
        kind: "runtime",
        command: {
          type: "list_activity",
          objectKind: rawKind,
          objectId: requireArgument(
            args[1],
            "history [process|file|service|configuration|connection <id>]",
          ),
        },
      };
    }

    case "stop-service":
      requireNoExtraArgs(
        args,
        1,
        "stop-service <name>",
      );
      return {
        kind: "runtime",
        command: {
          type: "stop_service",
          name: requireArgument(
            args[0],
            "stop-service <name>",
          ),
        },
      };

    case "start-service":
      requireNoExtraArgs(
        args,
        1,
        "start-service <name>",
      );
      return {
        kind: "runtime",
        command: {
          type: "start_service",
          name: requireArgument(
            args[0],
            "start-service <name>",
          ),
        },
      };

    case "set-startup": {
      requireNoExtraArgs(
        args,
        2,
        "set-startup <name> <automatic|manual|disabled>",
      );
      const serviceName = requireArgument(
        args[0],
        "set-startup <name> <automatic|manual|disabled>",
      );
      const startupMode = requireArgument(
        args[1],
        "set-startup <name> <automatic|manual|disabled>",
      ).toLowerCase();

      if (!isServiceStartupMode(startupMode)) {
        throw new Error(
          `Range command set-startup requires automatic, manual, or disabled; received: ${startupMode}.`,
        );
      }

      return {
        kind: "runtime",
        command: {
          type: "set_service_startup_mode",
          name: serviceName,
          startupMode,
        },
      };
    }

    case "kill": {
      requireNoExtraArgs(args, 1, "kill <pid>");
      const rawPid = requireArgument(
        args[0],
        "kill <pid>",
      );
      const pid = Number(rawPid);

      if (
        !Number.isInteger(pid) ||
        pid <= 0
      ) {
        throw new Error(
          "Range command kill requires a positive integer pid.",
        );
      }

      return {
        kind: "runtime",
        command: {
          type: "terminate_process",
          pid,
        },
      };
    }

    case "quarantine":
      requireNoExtraArgs(
        args,
        2,
        "quarantine <path> <destination>",
      );
      return {
        kind: "runtime",
        command: {
          type: "quarantine_file",
          path: requireArgument(
            args[0],
            "quarantine <path> <destination>",
          ),
          destinationPath: requireArgument(
            args[1],
            "quarantine <path> <destination>",
          ),
        },
      };

    default:
      throw new Error(
        `Unknown Range command: ${name}. Type help for the supported command set.`,
      );
  }
}
