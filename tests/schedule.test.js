import test from "node:test";
import assert from "node:assert/strict";
import { localDate, nextScheduledRun } from "../server/engine.js";

const iso = (value) => new Date(value).toISOString();

test("business dates use Istanbul even while UTC is still the previous day", () => {
  assert.equal(localDate(new Date("2026-09-09T20:59:59Z")), "2026-09-09");
  assert.equal(localDate(new Date("2026-09-09T21:00:00Z")), "2026-09-10");
});

test("next morning starts at 08:00 Istanbul in both summer and winter", () => {
  for (const day of ["2026-09-09", "2027-01-09"]) {
    assert.equal(
      iso(nextScheduledRun(new Date(`${day}T04:59:59Z`))),
      `${day}T05:00:00.000Z`,
    );
  }
});

test("the next morning rolls forward after the daily starting time", () => {
  assert.equal(
    iso(nextScheduledRun(new Date("2026-09-09T05:00:01Z"))),
    "2026-09-10T05:00:00.000Z",
  );
  assert.equal(
    iso(nextScheduledRun(new Date("2026-12-31T22:00:00Z"))),
    "2027-01-01T05:00:00.000Z",
  );
});
