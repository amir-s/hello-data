const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const DB = require("../flatdb");

test("cache is created, persisted, and recreated after truncation", () => {
  const dir = fs.mkdtempSync(join(tmpdir(), "hello-data-cache-"));
  const file = join(dir, "cache.json");
  try {
    const db = new DB(file);
    db.set("stock", { price: "42" });
    assert.deepEqual(new DB(file).get("stock"), { price: "42" });
    assert.deepEqual(fs.readdirSync(dir), ["cache.json"]);

    fs.writeFileSync(file, '{"version":0,"entries":');
    const recovered = new DB(file);
    assert.equal(recovered.get("stock"), null);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { version: 0, entries: {} });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
