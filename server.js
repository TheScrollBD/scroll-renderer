import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/", (req, res) => res.send("OK"));

// ✅ THIS IS THE PNG API
app.get("/render", async (req, res) => {
  const { title = "", source = "", img = "" } = req.query;

  // তোমার GitHub Pages poster site URL (Step 1 done যেটা)
  const POSTER_URL = "https://thescrollbd.github.io/The-Scroll-Poster/";

  // query সহ URL বানাচ্ছি
  const url =
    `${POSTER_URL}?title=${encodeURIComponent(title)}` +
    `&source=${encodeURIComponent(source)}` +
    `&img=${encodeURIComponent(img)}`;

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });

  try {
    await page.goto(url, { waitUntil: "networkidle" });

    // font load wait
    await page.evaluate(() => document.fonts?.ready);

    // template div screenshot
    const el = await page.$("#template");
    const png = await el.screenshot({ type: "png" });

    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  } finally {
    await browser.close();
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Renderer running on", port));
