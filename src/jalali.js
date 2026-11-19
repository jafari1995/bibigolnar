/**
 * Jalali (Persian) calendar conversion.
 * Algorithm follows jalaali-js (MIT), itself based on Kazimierz M. Borkowski.
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

/**
 * Official Solar Hijri corrections where the 33-year cycle drifts.
 * `leap === 0` means that Jalali year is a leap year (Esfand has 30 days),
 * matching jalaali-js. `yearsSinceLeap` is the same field: 0 = leap, 1..4 otherwise.
 * `march` is the Gregorian day of March of 1 Farvardin.
 */
const CALENDAR_OVERRIDE = {
  // 1403 starts 20 Mar 2024 and is NOT a leap year (ends 19 Mar 2025).
  1403: { leap: 1 },
  // 1404 starts 20 Mar 2025 and IS a leap year (ends 20 Mar 2026).
  1404: { march: 20, leap: 0 },
  // 1405 starts 21 Mar 2026; previous year was leap, so yearsSinceLeap = 1.
  1405: { leap: 1 },
};

function div(a, b) {
  return ~~(a / b);
}
function mod(a, b) {
  return a - ~~(a / b) * b;
}

function jalCal(jy, withoutLeap) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new Error("Invalid Jalaali year " + jy);
  }
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  let march = 20 + leapJ - leapG;
  // Official Tehran Nowruz (astronomical) when it disagrees with the 33-year cycle.
  const override = CALENDAR_OVERRIDE[jy];
  if (override?.march != null) march = override.march;
  if (withoutLeap) return { gy, march };
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  if (override?.leap != null) leap = override.leap;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm;
  let jd;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

export function toJalaali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

export function isLeapJalaaliYear(jy) {
  const r = jalCal(jy, false);
  return r.leap === 0;
}

export function jalaaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

export function isValidJalaaliDate(jy, jm, jd) {
  return (
    Number.isInteger(jy) &&
    Number.isInteger(jm) &&
    Number.isInteger(jd) &&
    jy >= 1 &&
    jy <= 1600 &&
    jm >= 1 &&
    jm <= 12 &&
    jd >= 1 &&
    jd <= jalaaliMonthLength(jy, jm)
  );
}

export function isValidGregorianDate(gy, gm, gd) {
  if (!Number.isInteger(gy) || !Number.isInteger(gm) || !Number.isInteger(gd)) return false;
  if (gy < 1600 || gy > 2800 || gm < 1 || gm > 12 || gd < 1) return false;
  const dim = [31, isGregorianLeap(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return gd <= dim[gm - 1];
}

export function isGregorianLeap(gy) {
  return gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0);
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
