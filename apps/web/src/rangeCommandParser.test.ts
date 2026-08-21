import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseRangeCommand,
} from "./rangeCommandParser";

describe("Range command parser", () => {
  it("compiles supported read commands into structured host commands", () => {
    expect(
      parseRangeCommand(
        "cat /Users/smartinez/AppData/Local/Temp/finance-update.ps1",
      ),
    ).toEqual({
      kind: "runtime",
      command: {
        type: "read_file",
        path: "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
      },
    });

    expect(
      parseRangeCommand("net"),
    ).toEqual({
      kind: "runtime",
      command: {
        type: "list_network",
      },
    });
  });

  it("compiles supported mutations without constructing shell commands", () => {
    expect(
      parseRangeCommand("kill 8420"),
    ).toEqual({
      kind: "runtime",
      command: {
        type: "terminate_process",
        pid: 8420,
      },
    });

    expect(
      parseRangeCommand(
        "quarantine /Users/smartinez/AppData/Local/Temp/finance-update.ps1 /Quarantine/finance-update.ps1",
      ),
    ).toEqual({
      kind: "runtime",
      command: {
        type: "quarantine_file",
        path: "/Users/smartinez/AppData/Local/Temp/finance-update.ps1",
        destinationPath:
          "/Quarantine/finance-update.ps1",
      },
    });
  });

  it("supports quoted arguments and rejects unknown or malformed input", () => {
    expect(
      parseRangeCommand(
        "cat '/Users/smartinez/Downloads/QuarterlyReview.docm'",
      ),
    ).toMatchObject({
      kind: "runtime",
      command: {
        type: "read_file",
      },
    });

    expect(() =>
      parseRangeCommand("whoami"),
    ).toThrow(
      "Unknown Range command: whoami. Type help for the supported command set.",
    );
    expect(() =>
      parseRangeCommand("kill powershell"),
    ).toThrow(
      "Range command kill requires a positive integer pid.",
    );
    expect(() =>
      parseRangeCommand("cat 'unterminated"),
    ).toThrow(
      "Range command contains an unterminated quote.",
    );
  });
});
