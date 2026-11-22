import assert from "node:assert/strict";
import test from "node:test";
import { csvToJson, jsonToCsv } from "../src/lib/csv.ts";

const roundtrip = (value, label) => {
  const csv = jsonToCsv(value);
  assert.deepEqual(csvToJson(csv), value, label);
};

test("CSV buffer has no BOM (the download adds it for Excel)", () => {
  const csv = jsonToCsv({ a: 1 });
  assert.ok(!csv.startsWith("\uFEFF"));
});

test("default nested document round-trips", () => {
  roundtrip(
    {
      fruits: [
        {
          name: "Apple",
          color: "#FF0000",
          details: { type: "Pome", season: "Fall" },
          nutrients: { calories: 52, fiber: "2.4g", vitaminC: "4.6mg" },
        },
        {
          name: "Banana",
          color: "#FFFF00",
          details: { type: "Berry", season: "Year-round" },
          nutrients: { calories: 89, fiber: "2.6g", potassium: "358mg" },
        },
      ],
    },
    "nested array under a root key"
  );
});

test("row projection keeps missing keys missing", () => {
  const value = [{ name: "A", extra: true }, { name: "B" }];
  const csv = jsonToCsv(value);
  assert.match(csv, /^.*extra/);
  assert.deepEqual(csvToJson(csv), value);
});

test("scalars, empty containers and root values round-trip", () => {
  for (const value of [
    [1, "two", null, false],
    [],
    {},
    null,
    "hello",
    42,
    { count: 2, fruits: [{ id: 1, tags: ["a", "b"] }] },
    { $jsoncrack$root: "literal" },
    { "a.b": 1, "c,d": 2, "e[]": 3, 'f"g': 4 },
  ]) {
    roundtrip(value, JSON.stringify(value));
  }
});

test("CSV type fidelity: quoted strings stay strings", () => {
  const value = { n: null, empty: "", zero: 0, no: false, s52: "52", st: "true" };
  assert.deepEqual(csvToJson(jsonToCsv(value)), value);
});

test("external CSV without projection markers imports as row objects", () => {
  assert.deepEqual(csvToJson("name,age\nAlice,30\nBob,25\n"), [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
  assert.deepEqual(csvToJson("name,age\nAlice,30\n"), { name: "Alice", age: 30 });
});
