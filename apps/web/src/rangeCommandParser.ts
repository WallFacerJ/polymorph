import type {
  SyntheticHostCommand,
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
  "stop-service <name>",
  "start-service <name>",
  "kill <pid>",
  "quarantine <path> <destination>",
] as const;

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
