import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/", (req, res) => res.send("OK"));

app.get("/render", async (req, res) => {
  const { title = "", source = "", img = "" } = req.query;

  const POSTER_URL = "https://thescrollbd.github.io/The-Scroll-Poster/";

  const url =
    `${POSTER_URL}?title=${encodeURIComponent(title)}` +
    `&source=${encodeURIComponent(source)}` +
    `&img=${encodeURIComponent(img)}`;

  let browser;

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
    });

    await page.goto(url, { waitUntil: "networkidle" });

    // font load wait
    await page.evaluate(() => document.fonts?.ready);

    const el = await page.$("#template");

    // 🛡️ GUARD (this is the fix)
    if (!el) {
      throw new Error("Template element (#template) not found on page");
    }

    const png = await el.screenshot({ type: "png" });

    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    console.error("Render error:", err);
    res.status(500).json({
      error: "Render failed",
      details: String(err.message || err),
    });
  } finally {
    if (browser) await browser.close();
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("Renderer running on", port);
});
