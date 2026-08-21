import {
  expect,
  test,
  type Page,
} from "@playwright/test";

async function runRangeCommand(
  page: Page,
  command: string,
) {
  const input = page.getByLabel("Range command");

  await input.fill(command);
  await page.getByRole(
    "button",
    { name: "Run", exact: true },
  ).click();
}

async function openRange(page: Page) {
  await page.getByRole(
    "button",
    { name: "Range", exact: true },
  ).click();

  return page.getByRole(
    "region",
    { name: "Range synthetic host workspace" },
  );
}

test("service startup persistence changes remain separate from runtime state and project across tools", async ({
  page,
}) => {
  await page.goto("/");
  let range = await openRange(page);

  await runRangeCommand(
    page,
    "service AcmeBackupAgent",
  );
  let serviceResult = range
    .locator(".range-command-block")
    .last();

  await expect(serviceResult).toContainText(
    "AcmeBackupAgent: running",
  );
  await expect(serviceResult).toContainText(
    "startup: automatic",
  );

  await runRangeCommand(
    page,
    "set-startup AcmeBackupAgent disabled",
  );
  const mutation = range
    .locator(".range-command-block")
    .last();

  await expect(mutation).toContainText(
    "changed: service AcmeBackupAgent",
  );
  await expect(mutation).toContainText(
    "Changed synthetic host service AcmeBackupAgent startup mode automatic -> disabled.",
  );

  await runRangeCommand(
    page,
    "service AcmeBackupAgent",
  );
  serviceResult = range
    .locator(".range-command-block")
    .last();

  await expect(serviceResult).toContainText(
    "AcmeBackupAgent: running",
  );
  await expect(serviceResult).toContainText(
    "startup: disabled",
  );

  await page.getByRole(
    "button",
    { name: "Endpoint", exact: true },
  ).click();

  const edr = page.getByRole(
    "region",
    { name: "EDR endpoint workspace" },
  );
  const responseHistory = page.getByRole(
    "region",
    { name: "EDR Range response history" },
  );

  await expect(edr).toBeVisible();
  await expect(responseHistory).toContainText(
    "HOST_SERVICE_STARTUP_MODE_CHANGED",
  );
  await expect(responseHistory).toContainText(
    "Range changed service AcmeBackupAgent startup mode: automatic -> disabled.",
  );

  await responseHistory.getByRole(
    "button",
    { name: "Open canonical event in SIEM" },
  ).click();

  const siem = page.getByRole(
    "region",
    { name: "SIEM search workspace" },
  );

  await expect(siem).toBeVisible();
  await expect(
    page.getByLabel("SIEM query"),
  ).toHaveValue(/^eventId:/);
  await expect(siem).toContainText(
    "Range changed service AcmeBackupAgent startup mode on device-fin-lt-04: automatic -> disabled",
  );

  await page.getByRole(
    "button",
    { name: "Reset scenario" },
  ).click();
  range = await openRange(page);

  await runRangeCommand(
    page,
    "service AcmeBackupAgent",
  );
  serviceResult = range
    .locator(".range-command-block")
    .last();

  await expect(serviceResult).toContainText(
    "AcmeBackupAgent: running",
  );
  await expect(serviceResult).toContainText(
    "startup: automatic",
  );

  await page.getByRole(
    "button",
    { name: "Endpoint", exact: true },
  ).click();
  await expect(
    page.getByRole(
      "region",
      { name: "EDR Range response history" },
    ),
  ).toHaveCount(0);
});
