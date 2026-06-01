const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:8090/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "shot-desktop-home.png" });

  // dump the card area box info
  const info = await page.evaluate(() => {
    const root = document.getElementById("root");
    function describe(el, depth) {
      if (!el || depth > 6) return "";
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      let s = "  ".repeat(depth) + `${el.tagName}.${(el.className||"").toString().slice(0,20)} ` +
        `[${Math.round(r.width)}x${Math.round(r.height)}] flex=${cs.flexDirection} disp=${cs.display}\n`;
      for (const c of el.children) s += describe(c, depth + 1);
      return s;
    }
    return describe(root, 0);
  });
  console.log(info.split("\n").slice(0, 40).join("\n"));
  await browser.close();
})();
