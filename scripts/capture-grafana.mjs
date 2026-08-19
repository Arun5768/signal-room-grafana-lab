import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 1,
});

try {
  await page.goto(
    "http://localhost:3000/d/signal-room-checkout/signal-room?orgId=1&from=now-15m&to=now&refresh=5s&kiosk",
    { waitUntil: "domcontentloaded" },
  );

  await page.getByText("Signal Room — Checkout Observability", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.waitForTimeout(15_000);

  await page.screenshot({
    path: "docs/assets/grafana-signal-room-dashboard.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
