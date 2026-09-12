import test from "node:test";
import assert from "node:assert/strict";
import { localDate, nextScheduledRun, isWorkday } from "../server/engine.js";

const iso = (value) => new Date(value).toISOString();

test("business dates use Istanbul even while UTC is still the previous day", () => {
  assert.equal(localDate(new Date("2026-09-09T20:59:59Z")), "2026-09-09");
  assert.equal(localDate(new Date("2026-09-09T21:00:00Z")), "2026-09-10");
});

test("next morning starts at 08:00 Istanbul in both summer and winter", () => {
  // Both are workdays: a Wednesday in summer time, a Friday in winter time.
  for (const day of ["2026-09-09", "2027-01-08"]) {
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

test("the office is closed at the weekend, so Friday's next shift is Monday", () => {
  // Friday evening, after the shift: Saturday and Sunday are skipped.
  assert.equal(
    iso(nextScheduledRun(new Date("2026-09-11T15:00:00Z"))),
    "2026-09-14T05:00:00.000Z",
  );
  // Asked on Saturday or on Sunday, the answer is still Monday morning.
  assert.equal(
    iso(nextScheduledRun(new Date("2026-09-12T09:00:00Z"))),
    "2026-09-14T05:00:00.000Z",
  );
  assert.equal(
    iso(nextScheduledRun(new Date("2026-09-13T09:00:00Z"))),
    "2026-09-14T05:00:00.000Z",
  );
  // A start date that lands on a weekend waits for the working week.
  assert.equal(
    iso(nextScheduledRun(new Date("2026-09-10T09:00:00Z"), "2026-09-12")),
    "2026-09-14T05:00:00.000Z",
  );
  assert.equal(isWorkday("2026-09-11"), true);
  assert.equal(isWorkday("2026-09-12"), false);
  assert.equal(isWorkday("2026-09-13"), false);
  assert.equal(isWorkday("2026-09-14"), true);
});
