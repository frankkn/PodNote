const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  page.on("console", (m) => logs.push("[" + m.type() + "] " + m.text()));
  page.on("pageerror", (e) => logs.push("[pageerror] " + e.message + "\n" + (e.stack || "")));

  console.log("=== load / (dev) ===");
  await page.goto("http://localhost:8082/", { waitUntil: "load" });
  await page.waitForTimeout(6000); // dev bundle 較慢
  let body = await page.locator("body").innerText().catch(() => "");
  console.log("home text len:", body.length, "| has Podcast:", body.includes("Podcast"));

  console.log("=== click 筆記歷史 ===");
  const link = page.getByText("筆記歷史", { exact: true });
  console.log("link count:", await link.count());
  await link.first().click().catch((e) => console.log("click err:", e.message));
  await page.waitForTimeout(4000);
  body = await page.locator("body").innerText().catch(() => "");
  console.log("history text len:", body.length);

  console.log("=== LOGS ===");
  logs.forEach((l) => console.log(l));
  await browser.close();
})();
