const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  async function run(label, width) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const localErr = [];
    page.on("console", (m) => {
      if (m.type() === "error") localErr.push("[console] " + m.text().split("\n")[0]);
    });
    page.on("pageerror", (e) => localErr.push("[pageerror] " + e.message));

    console.log(`\n===== ${label} (width=${width}) =====`);
    await page.goto("http://localhost:8090/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    let body = await page.locator("body").innerText().catch(() => "");
    console.log("home:", body.includes("Podcast") ? "OK" : "FAIL", `(len ${body.length})`);

    for (const tab of ["筆記歷史", "設定", "生成筆記"]) {
      const link = page.getByText(tab, { exact: true });
      const n = await link.count();
      await link.first().click().catch((e) => console.log(`  click ${tab} err:`, e.message));
      await page.waitForTimeout(1500);
      body = await page.locator("body").innerText().catch(() => "");
      console.log(`  → ${tab}: ${body.length > 0 ? "rendered" : "BLANK"} (len ${body.length}, links ${n})`);
    }

    console.log(`errors: ${localErr.length}`);
    localErr.forEach((e) => console.log("  " + e));
    errors.push(...localErr);
    await page.close();
  }

  await run("DESKTOP", 1280);
  await run("MOBILE", 390);

  console.log(`\n===== TOTAL ERRORS: ${errors.length} =====`);
  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
