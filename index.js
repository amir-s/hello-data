require("dotenv").config({ quiet: true });

const Koa = require("koa");
const Router = require("@koa/router");
const cors = require("@koa/cors");
const logger = require("koa-logger");

const DB = require("./flatdb");

const photos = require("./db/parsed");

const { getImage, getStock, getCrypto, getWeather } = require("./utils");

const app = new Koa();
const router = new Router();

const db = new DB(process.env.CACHE_FILE || "./cache.json");

router.get("/v1/photo/random", (ctx) => {
  const index = Math.floor(Math.random() * photos.length);
  ctx.body = photos[index];
});

const photoByIndex = async (ctx) => {
  ctx.body = await getImage(~~ctx.params.index);
};
router.get("/v1/photo", photoByIndex);
router.get("/v1/photo/:index", photoByIndex);

const stockBySymbol = async (ctx) => {
  const symbol = ctx.params.symbol.replace(/\s/g, "").toUpperCase();
  const format = (ctx.query.format || "json").toLowerCase();

  if (!symbol) {
    ctx.status = 404;
    ctx.body = "Not found";
    return;
  }

  const market =
    ctx.params.market && ctx.params.market.replace(/\s/g, "").toUpperCase();

  console.log("requesting stock price for ", symbol, market);

  let data;

  const cached = db.get(`${symbol}-${market}`);
  if (cached) {
    console.log("serving from cache");
    data = cached;
  } else {
    data = await getStock(symbol, market);
    db.set(`${symbol}-${market}`, data);
  }

  if (!data) {
    ctx.status = 404;
    ctx.body = "Not found";
    return;
  }

  if (format === "json") {
    ctx.body = data;
  } else if (format === "text") {
    ctx.body = data.price;
  }
};
router.get("/v1/stock/:symbol", stockBySymbol);
router.get("/v1/stock/:symbol/:market", stockBySymbol);

router.get("/v1/crypto/:handle", async (ctx) => {
  const format = (ctx.query.format || "json").toLowerCase();

  const handle = ctx.params.handle.trim().replace(/\s/g, "-").toLowerCase();

  if (!handle) {
    ctx.status = 404;
    ctx.body = "Not found";
    return;
  }

  const data = await getCrypto(handle);

  if (!data) {
    ctx.status = 404;
    ctx.body = "Not found";
    return;
  }

  if (format === "json") {
    ctx.body = data;
  } else if (format === "text") {
    ctx.body = data.price;
  }
});

router.get("/v1/weather/:city", async (ctx) => {
  const city = ctx.params.city.trim().toLowerCase();

  if (!city) {
    ctx.status = 404;
    ctx.body = "Not found";
    return;
  }

  const data = await getWeather(city);

  if (!data) {
    ctx.status = 404;
    ctx.body = "Not found";
    return;
  }

  ctx.body = data;
});

router.get("/", (ctx) => {
  ctx.body = "Hello!";
});

router.get("/version", (ctx) => {
  ctx.body = { version: "0.0.7" };
});

router.get("/deploy-revision.txt", (ctx) => {
  ctx.type = "text/plain";
  ctx.body = process.env.APP_REVISION || "";
});

router.get("/healthz", (ctx) => {
  ctx.body = { status: "ok", revision: process.env.APP_REVISION || null };
});

router.get("/{*path}", (ctx) => {
  ctx.status = 404;
  ctx.body = "Not found";
});

app.use(logger()).use(cors()).use(router.routes()).use(router.allowedMethods());

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Started server on port #${port}`));
}

module.exports = app;
