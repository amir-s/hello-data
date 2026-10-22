const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDescription } = require("../utils");

const cases = [
  ["the title, the location (© the photographer/the source)", {
    title: "the title", location: "the location", photographer: "the photographer", source: "the source",
  }],
  ["the title, the street, the city, the country (© the photographer/the source)", {
    title: "the title", location: "the street, the city, the country", photographer: "the photographer", source: "the source",
  }],
  ["the title (© the photographer/the source)", {
    title: "the title", location: "", photographer: "the photographer", source: "the source",
  }],
  ["the title, the location (© the photographer)", {
    title: "the title", location: "the location", photographer: "the photographer", source: "",
  }],
  ["the title, the location (© /the source)", {
    title: "the title", location: "the location", photographer: "", source: "the source",
  }],
];

for (const [input, expected] of cases) {
  test(`parseDescription: ${input}`, () => {
    assert.deepEqual(parseDescription(input), expected);
  });
}
