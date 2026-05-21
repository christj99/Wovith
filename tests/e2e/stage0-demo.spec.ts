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

test("Stage 0 synthetic lens loop remains available", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("wovith-app")).toBeVisible();
  await expect(page.getByTestId("first-run-card")).toBeVisible();
  await page.getByRole("button", { name: "Add Synthetic Demo Lens" }).click();
  await expect(
    page.getByRole("heading", { name: "Daily Work Lens" }),
  ).toBeVisible();
  await expect(page.getByTestId("cell-card")).toHaveCount(4);
  await expect(page.getByTestId("dsl-editor")).toBeVisible();

  await page.getByTestId("refresh-all").focus();
  await page.keyboard.press("Enter");
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

  await page.getByTestId("clear-cache").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("No current result. Refresh to evaluate this cell.").first(),
  ).toBeVisible();
});

test("Stage 1 template lenses and mock Google Calendar flow work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("wovith.e2e.mockGoogle", "1");
  });
  await page.goto("/");

  await expect(page.getByTestId("first-run-card")).toBeVisible();
  await page
    .getByTestId("first-run-card")
    .getByRole("button", { name: /Daily Work Lens/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Daily Work Lens" }),
  ).toBeVisible();
  await expect(page.getByTestId("cell-card")).toHaveCount(5);

  await page.getByTestId("connect-google-calendar").click();
  await expect(page.getByTestId("google-calendar-connector")).toContainText(
    "connected",
  );
  await page.getByTestId("refresh-all").click();
  await expect(
    page.getByRole("heading", { name: "Upcoming Events" }),
  ).toBeVisible();
  await expect(
    page.getByText("3 Google Calendar Events item(s)").first(),
  ).toBeVisible();
  await expect(page.getByText("Design review").first()).toBeVisible();

  const designReviewRow = page
    .getByRole("row", { name: /Design review/ })
    .first();
  await expect(designReviewRow).toContainText("May 20, 2026, 2:00 PM");
  await expect(designReviewRow).not.toContainText("google-event-001");
  await expect(designReviewRow).not.toContainText("2026-05-20T18:00:00.000Z");

  const googleCell = page
    .getByTestId("cell-card")
    .filter({ hasText: "Upcoming Events" });
  await expect(googleCell.getByTestId("warning-summary")).toContainText(
    "This cell may display external content",
  );
  await googleCell.getByText("Warning details").click();
  await expect(googleCell.getByTestId("warning-details")).toContainText(
    "table renderer may display external-content field Title",
  );

  await designReviewRow
    .getByRole("button", { name: "Why for Design review" })
    .click();
  await expect(page.getByTestId("why-panel")).toContainText("Rule Trace");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("why-panel")).toHaveCount(0);

  await googleCell.getByRole("button", { name: "Useful" }).click();
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("wovith.stage0.store.v1"),
  );
  expect(stored).toContain('"kind":"useful"');
  expect(stored).not.toContain("Review launch polish.");

  await page.getByRole("button", { name: "Meeting Prep Lens" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Meeting Prep Lens" }),
  ).toBeVisible();
  await page.getByTestId("refresh-all").click();
  await expect(
    page.getByRole("heading", { name: "Meetings Missing Location" }),
  ).toBeVisible();
  await expect(
    page.getByText("Google Calendar Events item(s)").first(),
  ).toBeVisible();

  const firstCell = page.getByTestId("cell-card").first();
  await page.once("dialog", (dialog) => dialog.accept("Renamed Prep Cell"));
  await firstCell.getByRole("button", { name: "Rename" }).click();
  await expect(
    page.getByRole("heading", { name: "Renamed Prep Cell" }),
  ).toBeVisible();

  await firstCell.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByTestId("cell-card")).toHaveCount(5);

  await firstCell.getByRole("button", { name: "Disable" }).click();
  await expect(firstCell).toContainText("disabled");
  await expect(firstCell).toContainText("Cell disabled. Enable to evaluate.");
  await firstCell.getByRole("button", { name: "Enable" }).click();

  await page.once("dialog", (dialog) => dialog.accept());
  await firstCell.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("cell-card")).toHaveCount(4);

  await page.reload();
  await page
    .getByRole("button", { name: /Meeting Prep Lens/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Meeting Prep Lens" }),
  ).toBeVisible();
  await expect(page.getByTestId("cell-card")).toHaveCount(4);
});

test("Stage 1 mock Google Calendar no-events state is friendly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("wovith.e2e.mockGoogle", "1");
    window.localStorage.setItem("wovith.e2e.mockGoogleScenario", "no-events");
  });
  await page.goto("/");

  await page
    .getByTestId("first-run-card")
    .getByRole("button", { name: /Daily Work Lens/ })
    .click();
  await page.getByTestId("connect-google-calendar").click();
  await page.getByTestId("refresh-all").click();
  await expect(
    page.getByText("0 Google Calendar Events item(s)").first(),
  ).toBeVisible();
  await expect(
    page.getByText("No upcoming events found in the next 90 days.").first(),
  ).toBeVisible();
});
