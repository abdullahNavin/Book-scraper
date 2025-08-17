const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
require('dotenv').config()

const app = express();
app.use(cors());
app.use(express.json());

const AFFILIATE_TOKEN = process.env.ROKOMARI_TOKEN;
const AFFILIATE_API_URL = "https://affiliateback.rokomari.io/lnk/createCustomURL";
const AFFILIATE_PARAMS = "affId=44ARrOo1928OIAR&affs=30062&cma=604800";

app.get("/", (req, res) => {
  res.send("🚀 Cheerio + Axios scraper running on Render!");
});

app.post("/scrape", async (req, res) => {
  const { bookName } = req.body;
  if (!bookName) return res.status(400).json({ error: "Book name is required" });

  try {
    const searchUrl = `https://www.rokomari.com/search?term=${encodeURIComponent(bookName)}&search_type=ALL`;
    const { data: html } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const wrapper = $(".book-list-wrapper").first();
    if (!wrapper.length) return res.status(404).json({ error: "Book not found" });

    const linkElement = wrapper.find("a").first();
    const bookInfo = {
      bookTitle: wrapper.find(".book-title").first().text().trim() || null,
      author: wrapper.find(".book-author").first().text().trim() || null,
      originalPrice:
        wrapper.find(".original-price").first().text().replace("TK.", "").trim() || null,
      currentPrice:
        wrapper.find(".book-price").first().text().replace("TK.", "").trim() || null,
      link: linkElement.length ? `https://www.rokomari.com${linkElement.attr("href")}` : null,
    };

    const affiliateURL = `${bookInfo.link}?${AFFILIATE_PARAMS}`;
    bookInfo.affiliateLink = affiliateURL;

    try {
      const resShort = await fetch(AFFILIATE_API_URL, {
        method: "POST",
        headers: { Authorization: AFFILIATE_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ originalURL: affiliateURL, isCustom: true }),
      });
      if (resShort.ok) {
        const data = await resShort.json();
        bookInfo.affiliateShortLink = data?.result?.shortLinkId
          ? `https://rkmri.co/${data.result.shortLinkId}/`
          : null;
      } else bookInfo.affiliateShortLink = null;
    } catch (err) {
      bookInfo.affiliateShortLink = null;
    }

    res.json(bookInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
