import { expect, test } from "@playwright/test";

const operationsDsl = `from synthetic.mail.threads
where project is "Operations"
sort by received_at desc
take 20
show as list`;

const invalidDsl = `from synthetic.mail.threads
where unread == true
show as list`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("Stage 0 daily lens loop works end to end", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("wovith-app")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Daily Work Lens" }),
  ).toBeVisible();
  await expect(page.getByTestId("cell-card")).toHaveCount(4);
  await expect(page.getByTestId("dsl-editor")).toBeVisible();

  await expect(
    page.getByText("2 Synthetic Mail Threads item(s)"),
  ).toBeVisible();
  await expect(page.getByText("Receipt for design subscription")).toHaveCount(
    0,
  );

  await page.getByTestId("dsl-editor").fill(operationsDsl);
  await page.getByTestId("save-cell").click();
  await expect(
    page.getByText("1 Synthetic Mail Threads item(s)"),
  ).toBeVisible();
  await expect(page.getByText("Receipt for design subscription")).toBeVisible();

  await page.getByTestId("dsl-editor").fill(invalidDsl);
  await page.getByTestId("save-cell").click();
  await expect(page.getByRole("alert")).toContainText(
    "Where clauses must use canonical predicate syntax",
  );

  const whyButtons = page.getByRole("button", { name: "Why" });
  await expect(whyButtons.first()).toBeVisible();
  await whyButtons.first().click();
  await expect(page.getByTestId("why-panel")).toContainText("Rule Trace");
  await expect(page.getByTestId("why-panel")).toContainText("Evidence");

  await page.reload();
  await expect(page.getByTestId("dsl-editor")).toHaveValue(operationsDsl);
  await expect(
    page.getByText("1 Synthetic Mail Threads item(s)"),
  ).toBeVisible();

  await page.getByTestId("clear-cache").click();
  await expect(
    page.getByText("No current result. Refresh to evaluate").first(),
  ).toBeVisible();
});
