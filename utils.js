const cheerio = require("cheerio");

async function getImage(index = 0) {
  const URL = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${index}&n=1`;
  const response = await fetch(URL);
  const {
    images: [{ url, copyright, copyrightlink: link, title }],
  } = await response.json();
  return {
    title,
    url: `https://bing.com${url}`,
    link,
    description: parseDescription(copyright),
  };
}

function parseDescription(description) {
  const parsed = /([^,]*)(?:, )?(.*) \(©([^\/]*)\/?(.*)\)/.exec(description);

  if (!parsed) {
    return {
      title: "",
      location: "",
      photographer: "",
      source: "",
    };
  }

  return {
    title: parsed[1].trim(),
    location: parsed[2].trim(),
    photographer: parsed[3].trim(),
    source: parsed[4].trim(),
  };
}

function parseStockDetail(raw) {
  const data = /([-\+]\d+\.?\d*) \(([-\+]\d+\.?\d*)%\)/.exec(raw.trim());

  if (!data) return null;

  return {
    change: data[1],
    changePercentage: data[2],
  };
}
const MARKETS = [
  "TSE",
  "TSX",
  "TSX-V",
  "NASDAQ",
  "NYSE",
  "AMEX",
  "OTCBB",
  "INDEXSP",
];

async function getStock(symbol, market = "NYSE") {
  if (!MARKETS.includes(market) || !symbol) {
    return null;
  }

  const r = await fetch(`https://www.cnbc.com/quotes/${escape(symbol)}`, {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    },
  });

  console.log("status = ", r.status);
  const d = await r.text();

  const $ = cheerio.load(d);
  const raw = $("img.QuoteStrip-changeIcon:last").parent().text();
  const priceDetails = parseStockDetail(raw);
  if (!priceDetails) return null;

  const price = $("span.QuoteStrip-lastPrice:last").text();
  const { change, changePercentage } = priceDetails;
  const currency = $("div.QuoteStrip-quoteStripSubHeader span:last-child")
    .text()
    .replace(" | ", "");

  return {
    symbol: symbol.toUpperCase(),
    market,
    price,
    change,
    changePercentage,
    currency,
  };
}

async function getCrypto(id) {
  try {
    const r = await fetch(
      `https://api.cryptowat.ch/markets/kraken/${id}usd/summary`
    );
    const d = await r.json();

    return {
      id: id.toUpperCase(),
      symbol: id.toUpperCase(),
      price: d.result.price.last,
      currency: "USD",
      changePercentage: d.result.price.change.percentage.toFixed(3),
    };
  } catch (_) {
    return null;
  }
}
async function getWeather(city) {
  try {
    const r = await fetch(
      `https://www.google.com/search?q=${escape(city)}+weather`
    );
    const d = await r.text();
    const $ = cheerio.load(d);
    const location = $('span:contains("Weather").BNeawe')
      .parent()
      .prev()
      .prev()
      .text();

    const data = [];
    $('span:contains("Weather").BNeawe')
      .parent()
      .parent()
      .parent()
      .find("div.BNeawe > div")
      .each(function () {
        data.push($(this).text());
      });

    const [temperatureString, detail] = data;
    const temperature = temperatureString.replace(/[^\d]/g, "");
    const label = detail.split("\n").pop();

    return {
      location,
      temperature,
      label,
    };
  } catch (_) {
    return null;
  }
}

module.exports = {
  getImage,
  parseDescription,
  getStock,
  parseStockDetail,
  getCrypto,
  getWeather,
};
