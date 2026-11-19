// Convert spoken/written Persian number words (incl. colloquial & ordinal forms) into ASCII digits.
const UNITS = {
  "صفر": 0, "یک": 1, "یه": 1, "اول": 1, "دو": 2, "سه": 3, "چهار": 4, "چار": 4, "پنج": 5, "شش": 6, "شیش": 6,
  "هفت": 7, "هشت": 8, "نه": 9, "ده": 10, "یازده": 11, "دوازده": 12, "سیزده": 13, "چهارده": 14, "چارده": 14,
  "پانزده": 15, "پونزده": 15, "شانزده": 16, "شونزده": 16, "هفده": 17, "هیفده": 17, "هجده": 18, "هیجده": 18, "هیژده": 18,
  "نوزده": 19, "بیست": 20, "سی": 30, "چهل": 40, "پنجاه": 50, "شصت": 60, "هفتاد": 70, "هشتاد": 80, "نود": 90,
  "صد": 100, "یکصد": 100, "دویست": 200, "سیصد": 300, "چهارصد": 400, "پانصد": 500, "پونصد": 500, "ششصد": 600, "شیشصد": 600,
  "هفتصد": 700, "هشتصد": 800, "نهصد": 900,
};
const ORD = { "اول": 1, "یکم": 1, "دوم": 2, "سوم": 3, "سیم": 3 };
const SCALE = { "هزار": 1000 };

function base(word) {
  if (word in ORD) return ORD[word];
  if (word in UNITS) return UNITS[word];
  if (word in SCALE) return SCALE[word];
  for (const suf of ["مین", "ام", "م"]) {
    if (word.endsWith(suf)) {
      const w = word.slice(0, -suf.length);
      if (w in UNITS && w !== "") return UNITS[w];
    }
  }
  return null;
}

export function wordsToDigits(text) {
  const tokens = String(text).split(/(\s+|\u200c)/);
  const out = [];
  let acc = null, cur = 0, pendingSep = [];
  const flush = () => {
    if (acc !== null) { out.push(String(acc + cur)); acc = null; cur = 0; }
    out.push(...pendingSep); pendingSep = [];
  };
  for (const t of tokens) {
    if (/^(\s+|\u200c)$/.test(t) || t === "") { if (acc !== null) pendingSep.push(t); else out.push(t); continue; }
    if (t === "و" && acc !== null) { pendingSep.push(t); continue; }
    const v = base(t);
    // "نه" alone is usually "no"; only treat as 9 when part of a larger number
    if (v !== null && !(t === "نه" && acc === null)) {
      if (acc === null) { acc = 0; cur = 0; }
      pendingSep = [];
      if (v === 1000) { acc += (cur || 1) * 1000; cur = 0; }
      else cur += v;
      continue;
    }
    flush();
    out.push(t);
  }
  flush();
  return out.join("");
}
