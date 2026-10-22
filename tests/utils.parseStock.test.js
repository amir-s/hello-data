const test = require("node:test");
const assert = require("node:assert/strict");
const { parseStockDetail } = require("../utils");

test("parseStockDetail uses the closing quote before after hours", () => {
  assert.deepEqual(
    parseStockDetail("  69.51 +0.10 (+0.14%) At close: April 18 at 4:00 PM EDT    69.06 -0.45 (-0.65%) After hours: April 18 at 7:59 PM EDT    "),
    { change: "+0.10", changePercentage: "+0.14" }
  );
});

test("parseStockDetail handles a closing quote alone", () => {
  assert.deepEqual(
    parseStockDetail("  95.79 +0.17 (+0.18%) At close: April 18 at 4:00 PM EDT     "),
    { change: "+0.17", changePercentage: "+0.18" }
  );
});

test("parseStockDetail rejects an unrecognized quote", () => {
  assert.equal(parseStockDetail("Unavailable"), null);
});
