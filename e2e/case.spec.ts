import {
  expect,
  test,
} from "@playwright/test";

async function collectLoginEvidence(page: import("@playwright/test").Page) {
  await page.getByRole(
    "button",
    { name: "Identity", exact: true },
  ).click();

  const identity = page.getByRole(
    "region",
    { name: "Identity investigation workspace" },
  );
  await identity.getByRole(
    "button",
    { name: /185\.220\.101\.42/ },
  ).click();
  await page.getByRole(
    "complementary",
    { name: "Identity event detail" },
  ).getByRole(
    "button",
    { name: "Collect evidence" },
  ).click();
}

async function collectPowerShellEvidence(page: import("@playwright/test").Page) {
  await page.getByRole(
    "button",
    { name: "Endpoint" },
  ).click();

  const edr = page.getByRole(
    "region",
    { name: "EDR endpoint workspace" },
  );
  await edr.getByRole(
    "button",
    { name: /powershell\.exe.*8420.*6172/i },
  ).click();
  await page.getByRole(
    "complementary",
    { name: "EDR observation detail" },
  ).getByRole(
    "button",
    { name: "Collect evidence" },
  ).click();
}

test("Case connects source evidence to hypotheses tasks and exact tool pivots", async ({
  page,
}) => {
  await page.goto("/");
  await collectLoginEvidence(page);
  await collectPowerShellEvidence(page);

  await page.getByRole(
    "button",
    { name: "Case", exact: true },
  ).click();

  let workspace = page.getByRole(
    "region",
    { name: "Case incident command workspace" },
  );

  await expect(workspace).toBeVisible();
  await expect(workspace).toContainText(
    "event-compromise-login",
  );
  await expect(workspace).toContainText(
    "event-compromise-powershell",
  );
  await expect(workspace).toContainText(
    "ip: 185.220.101.42",
  );

  const loginEvidence = workspace.locator(
    ".case-evidence-item",
  ).filter({
    hasText: "event-compromise-login",
  });
  const processEvidence = workspace.locator(
    ".case-evidence-item",
  ).filter({
    hasText: "event-compromise-powershell",
  });

  await loginEvidence.locator(
    'input[type="checkbox"]',
  ).check();
  await processEvidence.locator(
    'input[type="checkbox"]',
  ).check();

  await page.getByLabel("Hypothesis title").fill(
    "Compromised Finance identity drove endpoint execution",
  );
  await page.getByLabel("Hypothesis summary").fill(
    "The unusual authentication and encoded PowerShell are part of the same incident path.",
  );
  await page.getByRole(
    "button",
    { name: "Add hypothesis" },
  ).click();

  await page.getByLabel(
    "Hypothesis status Compromised Finance identity drove endpoint execution",
  ).selectOption("supported");

  await page.getByLabel("Task title").fill(
    "Validate external source across telemetry",
  );
  await page.getByLabel("Task owner").fill(
    "Tier 2 SOC",
  );
  await page.getByRole(
    "button",
    { name: "Add task" },
  ).click();
  await page.getByLabel(
    "Task status Validate external source across telemetry",
  ).selectOption("done");

  await page.getByLabel("Incident phase")
    .selectOption("containment");

  await expect(workspace).toContainText(
    "Compromised Finance identity drove endpoint execution",
  );
  await expect(workspace).toContainText(
    "Validate external source across telemetry",
  );
  await expect(workspace).toContainText(
    "Case phase: containment.",
  );

  await loginEvidence.getByRole(
    "button",
    { name: "Open exact in SIEM" },
  ).click();

  await expect(
    page.getByLabel("SIEM query"),
  ).toHaveValue(
    "eventId:event-compromise-login",
  );

  await page.getByRole(
    "button",
    { name: "Case", exact: true },
  ).click();
  workspace = page.getByRole(
    "region",
    { name: "Case incident command workspace" },
  );
  await expect(workspace).toContainText(
    "Compromised Finance identity drove endpoint execution",
  );
});

test("Case derives response decisions and report state from performed operations", async ({
  page,
}) => {
  await page.goto("/");
  await collectLoginEvidence(page);

  const identity = page.getByRole(
    "region",
    { name: "Identity investigation workspace" },
  );
  await identity.getByRole(
    "button",
    { name: /Revoke compromised session/ },
  ).click();

  await page.getByRole(
    "button",
    { name: "Identity", exact: true },
  ).click();
  await page.getByRole(
    "region",
    { name: "Identity investigation workspace" },
  ).getByRole(
    "button",
    { name: /Disable compromised account/ },
  ).click();

  await page.getByRole(
    "button",
    { name: "Case", exact: true },
  ).click();

  const workspace = page.getByRole(
    "region",
    { name: "Case incident command workspace" },
  );

  await expect(workspace).toContainText(
    "Revoke compromised session",
  );
  await expect(workspace).toContainText(
    "Disable compromised account",
  );
  await expect(workspace).toContainText(
    "event-containment-session-revoked",
  );
  await expect(workspace).toContainText(
    "event-containment-account-disabled",
  );
  await expect(workspace).toContainText(
    "2 response decision(s) were performed.",
  );
  await expect(workspace).toContainText(
    "Current run outcome: succeeded.",
  );
});
