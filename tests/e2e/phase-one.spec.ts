import { test, expect } from "@playwright/test";
test("homepage sections, images, FAQ, and responsive layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Find Your Best",
  );
  for (const title of [
    "How It Works",
    "Explore Most Popular Cars",
    "Frequently Asked Questions",
    "News & Insights For You",
  ])
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();

  await expect(
    page.getByText("Explore sedans, spacious SUVs", { exact: false }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const copy = await page.locator(".home-hero-copy").boundingBox();
    const car = await page.locator(".home-hero-car").boundingBox();
    expect(copy).not.toBeNull();
    expect(car).not.toBeNull();
    expect(car!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height);
  }
  const widths = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  const broken = await page.locator("img").evaluateAll(async (elements) => {
    const images = elements as HTMLImageElement[];
    images.forEach((image) => {
      image.loading = "eager";
    });
    await Promise.all(images.map((img) => img.decode().catch(() => {})));
    return images.filter((img) => !img.naturalWidth).map((img) => img.src);
  });
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `docs/screenshots/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("search validates dates and carries criteria into catalog", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("form", { name: "Search rental cars" }).getByRole("alert"),
  ).toHaveCount(2);
  await page
    .getByLabel("Pickup Location", { exact: true })
    .selectOption("Miami");
  await page.getByLabel("Pickup Date", { exact: true }).fill("2030-06-02");
  await page.getByLabel("Pickup Time", { exact: true }).fill("10:00");
  await page.getByLabel("Return Date", { exact: true }).fill("2030-06-01");
  await page.getByLabel("Return Time", { exact: true }).fill("10:00");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Return must be after pickup.")).toBeVisible();
  await page.getByLabel("Return Date", { exact: true }).fill("2030-06-03");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/cars\?location=Miami&pickup=/);
  await expect(
    page.getByRole("main").getByText("Showing 2 of 12 demo cars"),
  ).toBeVisible();
});
test("catalog filters combine, survive reload, and show empty results", async ({
  page,
}) => {
  await page.goto(
    "/cars?location=Miami&pickup=2030-06-02T10%3A00&return=2030-06-03T10%3A00",
  );
  await page
    .getByRole("combobox", { name: "Car Brand", exact: true })
    .selectOption("Ferrari");
  await page.getByRole("button", { name: "Filter Results" }).click();
  await expect(
    page.getByRole("main").getByText("Showing 1 of 12 demo cars"),
  ).toBeVisible();
  await expect(page).toHaveURL(/pickup=2030/);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Car Brand", exact: true }),
  ).toHaveValue("Ferrari");
  await page
    .getByRole("combobox", { name: "Car Category", exact: true })
    .selectOption("SUV");
  await page.getByRole("button", { name: "Filter Results" }).click();
  await expect(
    page.getByRole("heading", { name: "No cars found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear Filters", exact: true }).click();
  await expect(
    page.getByRole("main").getByText("Showing 12 of 12 demo cars"),
  ).toBeVisible();
});
test("vehicle preview and unknown vehicle are handled honestly", async ({
  page,
}) => {
  await page.goto("/cars");
  await page
    .getByRole("link", { name: "2018 Chevrolet Camaro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "2018 Chevrolet Camaro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Booking coming soon" }),
  ).toBeDisabled();
  await page.goto("/cars/not-a-vehicle");
  await expect(
    page.getByRole("heading", { name: "This road doesn’t lead anywhere." }),
  ).toBeVisible();
});
test("authentication dialog supports focus, keyboard dismissal and mode switching", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign In", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    dialog.getByRole("heading", { name: "Sign In", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});
test("navigation stays usable on small screens", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByText("Listing", { exact: true })
    .click();
  await page.getByRole("link", { name: "SUVs & family cars" }).click();
  await expect(page).toHaveURL(/\/cars\?category=SUV/);
  await expect(
    page.getByRole("main").getByText("Showing 1 of 12 demo cars"),
  ).toBeVisible();
});

test("homepage collection filters, local shortlist, and pricing toggle work", async ({
  page,
}) => {
  await page.goto("/");
  const popular = page.locator("#popular-cars");
  await expect(popular.locator("article.vehicle-card")).toHaveCount(8);
  await popular.getByRole("button", { name: "Toyota", exact: true }).click();
  await expect(popular.locator("article.vehicle-card")).toHaveCount(2);
  await popular
    .getByRole("button", { name: "All Brands", exact: true })
    .click();
  const save = popular.getByRole("button", {
    name: "Add Toyota Camry SE 350 to browser shortlist",
  });
  await save.click();
  await expect(
    popular.getByRole("button", {
      name: "Remove Toyota Camry SE 350 from browser shortlist",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    popular.getByRole("button", {
      name: "Remove Toyota Camry SE 350 from browser shortlist",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  const pricing = page.locator("#rental-info");
  await expect(pricing.getByText("$49", { exact: true })).toBeVisible();
  await pricing.getByRole("switch", { name: "Yearly pricing" }).click();
  await expect(pricing.getByText("$490", { exact: true })).toBeVisible();
  await expect(pricing.getByText("Example package / year")).toHaveCount(3);
});

test("carousels move with their controls", async ({ page }) => {
  await page.goto("/");
  const track = page
    .getByRole("region", { name: "vehicle categories", exact: true })
    .locator(".carousel-track");
  await page
    .getByRole("button", { name: "Next vehicle categories", exact: true })
    .click();
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(10);
  await page
    .getByRole("button", { name: "Previous vehicle categories", exact: true })
    .click();
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeLessThan(2);
});
