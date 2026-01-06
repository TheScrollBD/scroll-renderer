import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "5mb" }));

// তোমার template URL
const TEMPLATE_URL = "https://thescrollbd.github.io/The-Scroll-Poster/";

// health check
app.get("/", (_, res) => res.send("OK"));

// render endpoint
app.post("/render", async (req, res) => {
  let browser;
  try {
    const { text = "", source = "", img = "" } = req.body || {};

    const url = new URL(TEMPLATE_URL);
    if (text) url.searchParams.set("text", text);
    if (source) url.searchParams.set("source", source);
    if (img) url.searchParams.set("img", img);

    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 }
    });

    await page.goto(url.toString(), { waitUntil: "networkidle" });

    // wait for Bangla font + image
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    if (img) {
      await page.waitForFunction(() => {
        const el = document.getElementById("mainImage");
        return el && el.complete && el.naturalWidth > 0;
      }, { timeout: 20000 });
    }

    const el = await page.$("#template");
    if (!el) throw new Error("Cannot find #template on page");

    const png = await el.screenshot({ type: "png" });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Renderer running on", PORT));
