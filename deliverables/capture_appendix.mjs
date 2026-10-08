import { chromium } from "file:///C:/Users/Kittinan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = "https://bru-fondue.onrender.com";
const outputDir = path.resolve("deliverables/manual_assets");
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });

async function newContext(viewport = { width: 1440, height: 1000 }) {
  return browser.newContext({ viewport, deviceScaleFactor: 1, locale: "th-TH" });
}
async function login(page, email) {
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle", timeout: 120000 });
  const result = await page.evaluate(async ({ email }) => {
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "changeme123" }) });
    return { status: response.status, body: await response.json() };
  }, { email });
  if (result.status !== 200 || !result.body?.success) throw new Error(`Login failed for ${email}: ${result.status}`);
}
async function shot(page, route, fileName) {
  await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
}

{ const c = await newContext(); const page = await c.newPage(); await shot(page, "/", "01-landing.png"); await shot(page, "/login", "02-login.png"); await c.close(); }
{ const c = await newContext(); const page = await c.newPage(); await login(page, "670112418002@bru.ac.th"); await shot(page, "/report", "03-reporter-create.png"); await shot(page, "/my-tickets", "04-reporter-tickets.png"); await shot(page, "/notifications", "05-reporter-notifications.png"); const detail = await page.locator('a[href^="/tickets/"]').first().getAttribute("href"); if (detail) await shot(page, detail, "06-reporter-detail.png"); await c.close(); }
{ const c = await newContext(); const page = await c.newPage(); await login(page, "wilairat.y@bru.ac.th"); await shot(page, "/admin/dashboard", "07-admin-dashboard.png"); await shot(page, "/admin/tickets", "08-admin-tickets.png"); const detail = await page.locator('a[href^="/tickets/"]').first().getAttribute("href"); if (detail) await shot(page, detail, "09-admin-detail.png"); await shot(page, "/admin/settings", "10-admin-settings.png"); await c.close(); }
{ const c = await newContext(); const page = await c.newPage(); await login(page, "somchai.tech@bru.ac.th"); await shot(page, "/technician/jobs", "11-technician-jobs.png"); const detail = await page.locator('a[href^="/tickets/"]').first().getAttribute("href"); if (detail) await shot(page, detail, "12-technician-detail.png"); await c.close(); }
{ const c = await newContext({ width: 390, height: 844 }); const page = await c.newPage(); await login(page, "670112418002@bru.ac.th"); await shot(page, "/report", "13-mobile-report.png"); await c.close(); }

await browser.close();
console.log("manual-screenshots-ready");
