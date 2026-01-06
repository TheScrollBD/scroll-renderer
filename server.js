import express from "express";
import { chromium } from "playwright";

const app = express();

/** ✅ Basic health check */
app.get("/", (req, res) => res.send("OK"));

/** ✅ Small helpers (Guard) */
function safeText(v, max = 400) {
  if (v == null) return "";
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isValidHttpUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * ✅ PNG API
 * /render?title=...&source=...&img=...
 */
app.get("/render", async (req, res) => {
  // ✅ Guard: sanitize inputs
  const title = safeText(req.query.title, 800);
  const source = safeText(req.query.source, 200);
  const img = safeText(req.query.img, 2000);

  // ✅ Guard: basic validation
  if (!title) {
    return res.status(400).json({ error: "Missing required query: title" });
  }
  if (img && !isValidHttpUrl(img)) {
    return res.status(400).json({ error: "img must be a valid http/https URL" });
  }

  // তোমার GitHub Pages poster site URL
  const POSTER_URL = "https://thescrollbd.github.io/The-Scroll-Poster/";

  // query সহ URL বানাচ্ছি
  const url =
    `${POSTER_URL}?title=${encodeURIComponent(title)}` +
    `&source=${encodeURIComponent(source)}` +
    `&img=${encodeURIComponent(img)}`;

  let browser;
  try {
    // ✅ Launch browser (Render friendly)
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 2, // sharper
    });

    // ✅ Guard: timeout
    page.setDefaultTimeout(45000);

    // ✅ Go to page
    await page.goto(url, { waitUntil: "networkidle" });

    // ✅ Wait fonts
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // ✅ Guard: wait template exists
    await page.waitForSelector("#template", { timeout: 15000 });

    const el = await page.$("#template");
    if (!el) {
      return res.status(500).json({ error: "Template element #template not found" });
    }

    // ✅ Screenshot
    const png = await el.screenshot({ type: "png" });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  } catch (err) {
    console.error("Render error:", err);
    res.status(500).json({
      error: "Render failed",
      details: err?.message ? err.message : String(err),
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Renderer running on", port));
