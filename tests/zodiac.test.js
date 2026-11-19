import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toGregorian, toJalaali, isLeapJalaaliYear, jalaaliMonthLength } from "../src/jalali.js";
import {
  parseBirthDate,
  zodiacFromGregorian,
  readingFromDate,
} from "../src/zodiac.js";

describe("Jalali <-> Gregorian", () => {
  it("converts 28 Aban 1405 to 19 Nov 2026 (Asia/Tehran today in this project)", () => {
    const g = toGregorian(1405, 8, 28);
    assert.deepEqual(g, { gy: 2026, gm: 11, gd: 19 });
    const j = toJalaali(2026, 11, 19);
    assert.deepEqual(j, { jy: 1405, jm: 8, jd: 28 });
  });

  it("converts Nowruz 1405 to 21 March 2026", () => {
    assert.deepEqual(toGregorian(1405, 1, 1), { gy: 2026, gm: 3, gd: 21 });
    assert.deepEqual(toJalaali(2026, 3, 21), { jy: 1405, jm: 1, jd: 1 });
  });

  it("converts 15 Tir 1370 to 6 July 1991", () => {
    assert.deepEqual(toGregorian(1370, 4, 15), { gy: 1991, gm: 7, gd: 6 });
    assert.deepEqual(toJalaali(1991, 7, 6), { jy: 1370, jm: 4, jd: 15 });
  });


  it("matches official Nowruz dates including 1404 (20 Mar 2025)", () => {
    assert.deepEqual(toGregorian(1399, 1, 1), { gy: 2020, gm: 3, gd: 20 });
    assert.deepEqual(toGregorian(1403, 1, 1), { gy: 2024, gm: 3, gd: 20 });
    assert.deepEqual(toGregorian(1404, 1, 1), { gy: 2025, gm: 3, gd: 20 });
    assert.deepEqual(toJalaali(2025, 3, 20), { jy: 1404, jm: 1, jd: 1 });
    assert.deepEqual(toJalaali(2025, 3, 21), { jy: 1404, jm: 1, jd: 2 });
    assert.equal(isLeapJalaaliYear(1403), false);
    assert.equal(isLeapJalaaliYear(1404), true);
    assert.equal(jalaaliMonthLength(1404, 12), 30);
    assert.deepEqual(toGregorian(1404, 12, 30), { gy: 2026, gm: 3, gd: 20 });
    assert.deepEqual(toJalaali(2026, 3, 20), { jy: 1404, jm: 12, jd: 30 });
  });

  it("knows Esfand length and leap years around 1399 (leap) / 1400", () => {
    assert.equal(isLeapJalaaliYear(1399), true);
    assert.equal(jalaaliMonthLength(1399, 12), 30);
    assert.equal(jalaaliMonthLength(1400, 12), 29);
  });
});

describe("parseBirthDate", () => {
  it("parses Jalali numeric and named forms, including Persian digits", () => {
    const a = parseBirthDate("1370/4/15");
    assert.equal(a.ok, true);
    assert.equal(a.calendar, "jalali");
    assert.deepEqual([a.gy, a.gm, a.gd], [1991, 7, 6]);

    const b = parseBirthDate("۱۵ تیر ۱۳۷۰");
    assert.equal(b.ok, true);
    assert.equal(b.jy, 1370);
    assert.equal(b.jm, 4);
    assert.equal(b.jd, 15);

    const c = parseBirthDate("15-04-1370");
    assert.equal(c.ok, true);
    assert.equal(c.calendar, "jalali");
  });

  it("parses Gregorian ISO and named months", () => {
    const a = parseBirthDate("1991-07-06");
    assert.equal(a.ok, true);
    assert.equal(a.calendar, "gregorian");
    assert.equal(a.jy, 1370);
    assert.equal(a.jm, 4);

    const b = parseBirthDate("6 July 1991");
    assert.equal(b.ok, true);
    assert.equal(b.gy, 1991);
    assert.equal(b.gm, 7);
    assert.equal(b.gd, 6);
  });

  it("expands two-digit Jalali years", () => {
    const a = parseBirthDate("15/4/70");
    assert.equal(a.ok, true);
    assert.equal(a.jy, 1370);
  });

  it("rejects garbage", () => {
    assert.equal(parseBirthDate("سلام").ok, false);
    assert.equal(parseBirthDate("1370/13/01").ok, false);
  });
});

describe("zodiac signs", () => {
  it("uses tropical western boundaries", () => {
    assert.equal(zodiacFromGregorian(2026, 3, 20).id, "pisces");
    assert.equal(zodiacFromGregorian(2026, 3, 21).id, "aries");
    assert.equal(zodiacFromGregorian(1991, 7, 6).fa, "سرطان");
    assert.equal(zodiacFromGregorian(2026, 11, 19).fa, "عقرب");
    assert.equal(zodiacFromGregorian(2026, 12, 25).id, "capricorn");
    assert.equal(zodiacFromGregorian(2026, 1, 10).id, "capricorn");
  });

  it("builds a full reading from a Persian date string", () => {
    const r = readingFromDate("۱۵ تیر ۱۳۷۰");
    assert.equal(r.ok, true);
    assert.equal(r.sign.fa, "سرطان");
    assert.match(r.summary.jalali, /تیر/);
  });
});
