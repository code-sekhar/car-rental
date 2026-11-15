import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 2,
  }),
});
const created: string[] = [];
const bookingIds: string[] = [];
async function mailboxLink(
  email: string,
  kind: "verify-email" | "reset-password",
) {
  await expect
    .poll(async () =>
      db.emailOutbox.count({ where: { recipient: email, status: "SENT" } }),
    )
    .toBeGreaterThan(0);
  const mail = await db.emailOutbox.findFirstOrThrow({
    where: {
      recipient: email,
      subject: { contains: kind === "verify-email" ? "Verify" : "Reset" },
    },
    orderBy: { createdAt: "desc" },
  });
  const message = JSON.parse(
    await readFile(resolve(".local/e2e-mail", `${mail.id}.json`), "utf8"),
  );
  const match = message.text.match(/https?:\/\/[^\s]+/);
  if (!match) throw new Error("No recovery link found in private test mailbox");
  return match[0] as string;
}
test.afterAll(async () => {
  await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
  for (const email of created) {
    const user = await db.user.findUnique({ where: { email } });
    if (user) await db.user.delete({ where: { id: user.id } });
    await db.emailOutbox.deleteMany({ where: { recipient: email } });
  }
  await db.$disconnect();
});
test("real registration, verification, login restoration, logout and password reset", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const email = `browser-${randomUUID()}@example.test`;
  created.push(email);
  const password = "BrowserPassword2026";
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/register");
  await page.getByRole("main").getByLabel("Full name").fill("Browser Driver");
  await page
    .getByRole("main")
    .getByLabel("Email", { exact: false })
    .fill(email);
  await page
    .getByRole("main")
    .getByLabel("Password", { exact: true })
    .fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "instructions have been queued",
  );
  const pending = await db.user.findUniqueOrThrow({ where: { email } });
  expect(pending.emailVerified).toBeNull();
  const verifyLink = await mailboxLink(email, "verify-email");
  await page.goto(verifyLink);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await page.getByRole("link", { name: "Continue to sign in" }).click();
  const form = page.getByRole("main").locator("form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome, Browser Driver" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("main").getByText(email, { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/account-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const me = await page.request.get("/api/account/me");
  expect(me.status()).toBe(200);
  const body = JSON.stringify(await me.json());
  expect(body.includes("passwordHash")).toBe(false);
  expect(body.includes("sessionKey")).toBe(false);
  const other = await db.user.findUniqueOrThrow({
    where: { email: "customer@veltrix.test" },
  });
  const vehicle = await db.vehicle.findFirstOrThrow();
  const privateBooking = await db.booking.create({
    data: {
      reference: randomUUID(),
      idempotencyKey: randomUUID(),
      userId: other.id,
      vehicleId: vehicle.id,
      pickupLocationId: vehicle.locationId,
      returnLocationId: vehicle.locationId,
      pickupAt: new Date("2036-01-01T10:00:00Z"),
      returnAt: new Date("2036-01-02T10:00:00Z"),
      status: "DRAFT",
    },
  });
  bookingIds.push(privateBooking.id);
  const scoped = await page.request.get(
    `/api/account/bookings?userId=${other.id}`,
  );
  expect((await scoped.json()).bookings).toHaveLength(0);
  expect((await page.request.get("/api/admin/overview")).status()).toBe(403);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign Out", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get("/api/account/me")).status()).toBe(401);
  expect(await db.session.count({ where: { userId: pending.id } })).toBe(0);
  await page.goto("/login");
  await page.getByRole("main").getByLabel("Email").fill(email);
  await page
    .getByRole("main")
    .getByLabel("Password", { exact: true })
    .fill(password);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/forgot-password");
  await page.getByRole("main").getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "instructions have been queued",
  );
  const resetLink = await mailboxLink(email, "reset-password");
  await page.goto(resetLink);
  await page
    .getByRole("main")
    .getByLabel("New password")
    .fill("NewBrowserPassword2026");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "password has been reset",
  );
  // The old encrypted cookie still exists, so this proves server-side database revocation.
  expect((await page.request.get("/api/account/me")).status()).toBe(401);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("main").getByLabel("Email").fill(email);
  await page
    .getByRole("main")
    .getByLabel("Password", { exact: true })
    .fill(password);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Check your email",
  );
  await page
    .getByRole("main")
    .getByLabel("Password", { exact: true })
    .fill("NewBrowserPassword2026");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(resetLink);
  await page
    .getByRole("main")
    .getByLabel("New password")
    .fill("ReplayPassword2026");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "invalid or has expired",
  );
});
test("server enforces admin authorization and origin protection", async ({
  page,
}) => {
  expect((await page.request.get("/api/admin/overview")).status()).toBe(401);
  const payload = {
    name: "Attacker",
    email: "attacker@example.test",
    password: "AttackerPassword2026",
    role: "ADMIN",
  };
  const blocked = await page.request.post("/api/account/register", {
    headers: { Origin: "https://untrusted.example" },
    data: payload,
  });
  expect(blocked.status()).toBe(403);
  const injection = await page.request.post("/api/account/register", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: payload,
  });
  expect(injection.status()).toBe(400);
  const adminEmail = `admin-browser-${randomUUID()}@example.test`;
  created.push(adminEmail);
  await db.user.create({
    data: {
      name: "Browser Admin",
      email: adminEmail,
      emailVerified: new Date(),
      role: "ADMIN",
      passwordHash: await hash("VeltrixAdmin!2026", {
        algorithm: 2,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
    },
  });
  await page.goto("/login");
  await page.getByRole("main").getByLabel("Email").fill(adminEmail);
  await page
    .getByRole("main")
    .getByLabel("Password", { exact: true })
    .fill("VeltrixAdmin!2026");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const response = await page.request.get("/api/admin/overview");
  expect(response.status()).toBe(200);
  expect((await response.json()).vehicles).toBe(12);
  await page
    .getByRole("link", { name: "Admin Dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Admin Overview", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My Account", exact: true }).click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign Out", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
});
