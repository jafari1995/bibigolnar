import { normalizeFa, toAsciiDigits } from "./normalize.js";
import { wordsToDigits } from "./numwords.js";
import {
  toGregorian,
  toJalaali,
  isValidJalaaliDate,
  isValidGregorianDate,
  JALALI_MONTHS,
} from "./jalali.js";

/** Tropical western zodiac, computed from a Gregorian date. */
export const ZODIAC = [
  { id: "capricorn", fa: "جدی", en: "Capricorn", also: ["بزغاله"], from: [12, 22], to: [1, 19] },
  { id: "aquarius", fa: "دلو", en: "Aquarius", also: ["آب‌ریز"], from: [1, 20], to: [2, 18] },
  { id: "pisces", fa: "حوت", en: "Pisces", also: ["ماهی"], from: [2, 19], to: [3, 20] },
  { id: "aries", fa: "حمل", en: "Aries", also: ["قوچ"], from: [3, 21], to: [4, 19] },
  { id: "taurus", fa: "ثور", en: "Taurus", also: ["گاو"], from: [4, 20], to: [5, 20] },
  { id: "gemini", fa: "جوزا", en: "Gemini", also: ["دوپیکر"], from: [5, 21], to: [6, 20] },
  { id: "cancer", fa: "سرطان", en: "Cancer", also: ["خرچنگ"], from: [6, 21], to: [7, 22] },
  { id: "leo", fa: "اسد", en: "Leo", also: ["شیر"], from: [7, 23], to: [8, 22] },
  { id: "virgo", fa: "سنبله", en: "Virgo", also: ["دوشیزه"], from: [8, 23], to: [9, 22] },
  { id: "libra", fa: "میزان", en: "Libra", also: ["ترازو"], from: [9, 23], to: [10, 22] },
  { id: "scorpio", fa: "عقرب", en: "Scorpio", also: ["کژدم"], from: [10, 23], to: [11, 21] },
  { id: "sagittarius", fa: "قوس", en: "Sagittarius", also: ["کمان"], from: [11, 22], to: [12, 21] },
];

export function zodiacFromGregorian(gy, gm, gd) {
  const md = gm * 100 + gd;
  for (const z of ZODIAC) {
    const [fm, fd] = z.from;
    const [tm, td] = z.to;
    const a = fm * 100 + fd;
    const b = tm * 100 + td;
    if (a <= b) {
      if (md >= a && md <= b) return z;
    } else if (md >= a || md <= b) {
      return z; // wraps the year (Capricorn)
    }
  }
  return ZODIAC[0];
}

const MONTH_ALIASES = new Map();
function addMonth(n, ...names) {
  for (const name of names) MONTH_ALIASES.set(normalizeFa(name), n);
}
JALALI_MONTHS.forEach((name, i) => addMonth(i + 1, name));
addMonth(1, "farvardin");
addMonth(2, "ordibehesht", "ordebehesht");
addMonth(3, "khordad");
addMonth(4, "tir");
addMonth(5, "mordad", "mordad");
addMonth(6, "shahrivar");
addMonth(7, "mehr");
addMonth(8, "aban", "aban");
addMonth(9, "azar");
addMonth(10, "dey", "day");
addMonth(11, "bahman");
addMonth(12, "esfand");

const GREG_MONTHS = {
  january: 1, jan: 1, ژانویه: 1, جنوری: 1,
  february: 2, feb: 2, فوریه: 2, فوریه: 2, فبریه: 2,
  march: 3, mar: 3, مارس: 3, مارچ: 3,
  april: 4, apr: 4, آوریل: 4, اپریل: 4,
  may: 5, مه: 5, می: 5,
  june: 6, jun: 6, ژوئن: 6, جون: 6,
  july: 7, jul: 7, ژوئیه: 7, جولای: 7, ژولای: 7,
  august: 8, aug: 8, اوت: 8, آگوست: 8, اگوست: 8,
  september: 9, sep: 9, sept: 9, سپتامبر: 9,
  october: 10, oct: 10, اکتبر: 10,
  november: 11, nov: 11, نوامبر: 11,
  december: 12, dec: 12, دسامبر: 12,
};
for (const [k, v] of Object.entries(GREG_MONTHS)) addMonth(v, k);

/**
 * Guess calendar from the year: Jalali years in everyday use are ~1200–1699;
 * Gregorian civil years are 1700+.
 */
export function calendarFromYear(year) {
  if (year >= 1700) return "gregorian";
  if (year >= 1200 && year <= 1699) return "jalali";
  if (year >= 0 && year <= 99) return "two-digit";
  return null;
}

export function expandTwoDigitYear(y, preferJalali = true) {
  if (preferJalali) return y >= 50 ? 1300 + y : 1400 + y;
  return y >= 50 ? 1900 + y : 2000 + y;
}

/**
 * Parse a Jalali or Gregorian birth date from free Persian/English text.
 * @returns {{ ok: true, calendar: "jalali"|"gregorian", jy?: number, jm?: number, jd?: number, gy: number, gm: number, gd: number } | { ok: false, reason: string }}
 */
export function parseBirthDate(text) {
  const raw = wordsToDigits(normalizeFa(toAsciiDigits(String(text || "")))).trim();
  if (!raw) return { ok: false, reason: "empty" };

  const named = tryNamedMonth(raw);
  if (named.ok) return finalize(named);

  const nums = raw.match(/(\d{1,4})/g)?.map((s) => Number(s)) || [];
  // ISO or slash: 1370/4/15, 1370-04-15, 15/4/1370, 1991-07-06
  const m = raw.match(/(\d{1,4})[\/\-\. ]+(\d{1,2})[\/\-\. ]+(\d{1,4})/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    let c = Number(m[3]);
    return finalize(orderYmd(a, b, c));
  }

  if (nums.length >= 3) {
    return finalize(orderYmd(nums[0], nums[1], nums[2]));
  }
  return { ok: false, reason: "unparsed" };
}

function tryNamedMonth(raw) {
  const n = normalizeFa(toAsciiDigits(raw));
  let month = null;
  let monthName = null;
  for (const [name, num] of MONTH_ALIASES) {
    if (name.length >= 2 && n.includes(name)) {
      if (!monthName || name.length > monthName.length) {
        month = num;
        monthName = name;
      }
    }
  }
  if (!month) return { ok: false };
  const nums = n.match(/(\d{1,4})/g)?.map((s) => Number(s)) || [];
  if (nums.length < 1) return { ok: false, reason: "need-day" };
  if (nums.length === 1) {
    // Day + month only (e.g. «پونزده تیر»): the sign doesn't need a year.
    const day = nums[0];
    const isJ = JALALI_MONTHS.some((nm) => normalizeFa(nm) === monthName);
    return { ok: true, calendarHint: isJ ? "jalali" : "gregorian", y: isJ ? 1370 : 1991, m: month, d: day, noYear: true };
  }
  // day and year: usually "15 تیر 1370" or "تیر 15 1370" or "15 1370 تیر"
  let day;
  let year;
  if (nums[0] > 31 && nums[1] <= 31) {
    year = nums[0];
    day = nums[1];
  } else if (nums[1] > 31 && nums[0] <= 31) {
    day = nums[0];
    year = nums[1];
  } else if (nums[0] <= 31 && nums[1] <= 31) {
    // ambiguous; prefer day first
    day = nums[0];
    year = nums[1] < 100 ? nums[1] : nums[1];
  } else {
    year = nums[0];
    day = nums[1];
  }
  const isJalaliMonth = JALALI_MONTHS.some((nm) => normalizeFa(nm) === monthName);
  const cal = isJalaliMonth ? "jalali" : calendarFromYear(year) || "gregorian";
  return { ok: true, calendarHint: cal, y: year, m: month, d: day };
}

function orderYmd(a, b, c) {
  // Year-first if a is clearly a year
  if (a >= 1000 || (a >= 100 && a > 31)) {
    return { ok: true, y: a, m: b, d: c, calendarHint: calendarFromYear(a) };
  }
  // Year-last (European / common Iranian spoken order day/month/year)
  if (c >= 1000 || c > 31) {
    return { ok: true, y: c, m: b, d: a, calendarHint: calendarFromYear(c) };
  }
  // two-digit year at the end: 15/4/70
  if (c <= 99 && a <= 31) {
    return { ok: true, y: c, m: b, d: a, calendarHint: "two-digit" };
  }
  return { ok: false, reason: "ambiguous" };
}

function finalize(parts) {
  if (!parts || !parts.ok) return parts.ok === false ? parts : { ok: false, reason: "unparsed" };
  let { y, m, d, calendarHint } = parts;
  if (!y || !m || !d) return { ok: false, reason: "incomplete" };
  if (m < 1 || m > 12) return { ok: false, reason: "bad-month" };

  let calendar = calendarHint || calendarFromYear(y);
  if (calendar === "two-digit") {
    const jy = expandTwoDigitYear(y, true);
    if (isValidJalaaliDate(jy, m, d)) {
      y = jy;
      calendar = "jalali";
    } else {
      y = expandTwoDigitYear(y, false);
      calendar = "gregorian";
    }
  }
  if (!calendar) calendar = y < 1700 ? "jalali" : "gregorian";

  if (calendar === "jalali") {
    if (!isValidJalaaliDate(y, m, d)) return { ok: false, reason: "invalid-jalali" };
    const g = toGregorian(y, m, d);
    return { ok: true, calendar: "jalali", jy: y, jm: m, jd: d, gy: g.gy, gm: g.gm, gd: g.gd, noYear: !!parts.noYear };
  }
  if (!isValidGregorianDate(y, m, d)) return { ok: false, reason: "invalid-gregorian" };
  const j = toJalaali(y, m, d);
  return { ok: true, calendar: "gregorian", jy: j.jy, jm: j.jm, jd: j.jd, gy: y, gm: m, gd: d, noYear: !!parts.noYear };
}

export function formatBirth(parsed) {
  if (!parsed?.ok) return "";
  const jMonth = JALALI_MONTHS[parsed.jm - 1];
  return `${parsed.jd} ${jMonth} ${parsed.jy} (${parsed.gy}-${String(parsed.gm).padStart(2, "0")}-${String(parsed.gd).padStart(2, "0")})`;
}

export function readingFromDate(text) {
  const parsed = parseBirthDate(text);
  if (!parsed.ok) return parsed;
  const sign = zodiacFromGregorian(parsed.gy, parsed.gm, parsed.gd);
  return {
    ok: true,
    parsed,
    sign,
    summary: {
      jalali: parsed.noYear ? `${parsed.jd} ${JALALI_MONTHS[parsed.jm - 1]}` : `${parsed.jd} ${JALALI_MONTHS[parsed.jm - 1]} ${parsed.jy}`,
      gregorian: parsed.noYear ? `${String(parsed.gm).padStart(2, "0")}-${String(parsed.gd).padStart(2, "0")}` : `${parsed.gy}-${String(parsed.gm).padStart(2, "0")}-${String(parsed.gd).padStart(2, "0")}`,
      signFa: sign.fa,
      signEn: sign.en,
    },
  };
}
