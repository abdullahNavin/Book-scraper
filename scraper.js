const axios = require("axios");
const cheerio = require("cheerio");

const AFFILIATE_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzZjZjI4MTZiZGNjNWJjNDliYzkwNDAiLCJwaG9uZSI6IjAxNzE1MTc1MDIxIiwicm9sZSI6IkFGRklMSUFURSIsImlhdCI6MTc1NTI1Mjg4MywiZXhwIjoxNzU1ODU3NjgzfQ.i8GOgjiZcgLdQvdUjFGLUpchTmHBleukYPDHI955D-o";
const AFFILIATE_API_URL = "https://affiliateback.rokomari.io/lnk/createCustomURL";
const AFFILIATE_PARAMS = "affId=44ARrOo1928OIAR&affs=30062&cma=604800";

async function scrapeBookInfo(bookName) {
  const searchUrl = `https://www.rokomari.com/search?term=${encodeURIComponent(bookName)}&search_type=ALL`;

  // Fetch raw HTML
  const { data: html } = await axios.get(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    },
  });

  const $ = cheerio.load(html);

  const wrapper = $(".book-list-wrapper").first();
  if (!wrapper.length) {
    throw new Error("Book not found!");
  }

  const linkElement = wrapper.find("a").first();
  const bookTitle = wrapper.find(".book-title").first().text().trim() || null;
  const author = wrapper.find(".book-author").first().text().trim() || null;
  const originalPrice =
    wrapper.find(".original-price").first().text().replace("TK.", "").trim() || null;
  const currentPriceText = wrapper.find(".book-price").first().text().trim();
  const currentPrice = currentPriceText ? currentPriceText.replace("TK.", "").trim() : null;
  const link = linkElement.length
    ? `https://www.rokomari.com${linkElement.attr("href")}`
    : null;

  const bookInfo = { bookTitle, author, originalPrice, currentPrice, link };

  if (!bookInfo.link) {
    throw new Error("Book link not found!");
  }

  // Add affiliate link
  const affiliateURL = `${bookInfo.link}?${AFFILIATE_PARAMS}`;
  bookInfo.affiliateLink = affiliateURL;

  // Try to shorten link with API
  try {
    const res = await fetch(AFFILIATE_API_URL, {
      method: "POST",
      headers: {
        Authorization: AFFILIATE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalURL: affiliateURL,
        isCustom: true,
      }),
    });

    if (!res.ok) throw new Error(`Affiliate API request failed: ${res.statusText}`);

    const data = await res.json();
    bookInfo.affiliateShortLink = data?.result?.shortLinkId
      ? `https://rkmri.co/${data.result.shortLinkId}/`
      : null;
  } catch (err) {
    console.error("Affiliate short link generation failed:", err.message);
    bookInfo.affiliateShortLink = null;
  }

  return bookInfo;
}


module.exports = { scrapeBookInfo };
