const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, existsSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { once } = require("node:events");

const temp = mkdtempSync(join(tmpdir(), "hello-data-routes-"));
process.env.CACHE_FILE = join(temp, "cache.json");
process.env.APP_REVISION = "a".repeat(40);

const utilsPath = require.resolve("../utils");
const utils = require(utilsPath);
const calls = { image: [], stock: [] };
require.cache[utilsPath].exports = {
  ...utils,
  getImage: async (index) => {
    calls.image.push(index);
    return { index, title: "sample" };
  },
  getStock: async (symbol, market = "NYSE") => {
    calls.stock.push([symbol, market]);
    return { symbol, market, price: "123.45", change: "+1", changePercentage: "+1", currency: "USD" };
  },
  getCrypto: async () => null,
  getWeather: async () => null,
};

const app = require("../index");
let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(temp, { recursive: true, force: true });
});

test("root, legacy version, and exact deploy revision", async () => {
  assert.equal(await (await fetch(base)).text(), "Hello!");
  assert.deepEqual(await (await fetch(`${base}/version`)).json(), { version: "0.0.7" });
  const revision = await fetch(`${base}/deploy-revision.txt`);
  assert.equal(revision.status, 200);
  assert.match(revision.headers.get("content-type"), /^text\/plain/);
  assert.equal(await revision.text(), "a".repeat(40));
  assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), {
    status: "ok", revision: "a".repeat(40),
  });
  assert.equal(existsSync(process.env.CACHE_FILE), true);
});

test("photo routes keep random and optional index behavior", async () => {
  const random = await fetch(`${base}/v1/photo/random`);
  assert.equal(random.status, 200);
  assert.equal(random.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(Object.keys(await random.json()).sort(), ["description", "link", "title", "url"]);
  assert.deepEqual(await (await fetch(`${base}/v1/photo`)).json(), { index: 0, title: "sample" });
  assert.deepEqual(await (await fetch(`${base}/v1/photo/2`)).json(), { index: 2, title: "sample" });
  assert.deepEqual(calls.image, [0, 2]);
});

test("stock routes preserve JSON, text, and cache", async () => {
  const stock = await fetch(`${base}/v1/stock/shop/tsx`);
  assert.equal(stock.status, 200);
  assert.deepEqual(await stock.json(), {
    symbol: "SHOP", market: "TSX", price: "123.45", change: "+1", changePercentage: "+1", currency: "USD",
  });
  assert.equal(await (await fetch(`${base}/v1/stock/SHOP/TSX?format=text`)).text(), "123.45");
  assert.deepEqual(calls.stock, [["SHOP", "TSX"]]);
  assert.equal((await fetch(`${base}/v1/stock/SHOP`)).status, 200);
  assert.deepEqual(calls.stock[1], ["SHOP", "NYSE"]);
});

test("unavailable upstream responses and unknown GET remain 404", async () => {
  for (const path of ["/v1/crypto/btc", "/v1/weather/Toronto", "/unknown"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Not found");
  }
});
