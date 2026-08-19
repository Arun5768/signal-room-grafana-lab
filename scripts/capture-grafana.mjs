import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 1,
});

try {
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

  const username = page.getByLabel(/email or username/i);
  if (await username.isVisible()) {
    await username.fill("admin");
    await page.getByLabel(/password/i).fill("admin");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForLoadState("networkidle");

    const skipPasswordChange = page.getByRole("button", { name: /skip/i });
    if (await skipPasswordChange.isVisible().catch(() => false)) {
      await skipPasswordChange.click();
    }
  }

  await page.goto(
    "http://localhost:3000/d/signal-room-checkout/signal-room?orgId=1&from=now-15m&to=now&refresh=5s&kiosk",
    { waitUntil: "networkidle" },
  );

  await page.getByText("Checkout throughput", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.waitForTimeout(12_000);

  await page.screenshot({
    path: "docs/assets/grafana-signal-room-dashboard.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
