import { normalizeFa } from "./normalize.js";

/** Classical abjad-e kabir, with common Persian extensions for پ چ ژ گ. */
const ABJAD = {
  ا: 1, آ: 1, أ: 1, إ: 1, ٱ: 1,
  ب: 2, پ: 2,
  ج: 3, چ: 3,
  د: 4,
  ه: 5, ة: 5,ۀ: 5, ه: 5,
  و: 6, ؤ: 6,
  ز: 7, ژ: 7,
  ح: 8,
  ط: 9,
  ی: 10, ي: 10, ى: 10, ئ: 10, ء: 1,
  ک: 20, ك: 20, گ: 20,
  ل: 30,
  م: 40,
  ن: 50,
  س: 60,
  ع: 70,
  ف: 80,
  ص: 90,
  ق: 100,
  ر: 200,
  ش: 300,
  ت: 400,
  ث: 500,
  خ: 600,
  ذ: 700,
  ض: 800,
  ظ: 900,
  غ: 1000,
};

const TRIGGER_STRIP =
  /فال\s*(?:ابجد|اسم|نام)|ابجد|عدد\s*(?:اسم|نام)|حروف\s*ابجد|اسمم|اسممِ|اسممَ|نامم|اسمِ?|نامِ?/g;

export function abjadValue(name) {
  const s = String(name || "");
  let total = 0;
  const letters = [];
  for (const ch of s) {
    const v = ABJAD[ch];
    if (v != null) {
      total += v;
      letters.push({ ch, v });
    }
  }
  let reduced = total;
  const steps = [total];
  while (reduced > 9) {
    reduced = String(reduced)
      .split("")
      .reduce((a, d) => a + Number(d), 0);
    steps.push(reduced);
  }
  return { name: s.trim(), total, reduced, steps, letters };
}

const ROOT_MOOD = {
  1: "آغاز و خواستن",
  2: "همراهی و نرمی",
  3: "بیان و شادی",
  4: "ثبات و کار",
  5: "جنبش و آزادی",
  6: "مهر و مسئولیت",
  7: "خلوت و تفکر",
  8: "قدرت و ثمر مادی",
  9: "تمام‌کردن و بخشش",
};

export function readName(name) {
  const r = abjadValue(name);
  return {
    ...r,
    mood: ROOT_MOOD[r.reduced] || "راز اسم",
  };
}

export function extractName(text) {
  let s = String(text || "").trim();
  s = s.replace(/^\s*\/[a-zA-Z0-9_]+(?:@[\w]+)?\s*/, "");
  const n = normalizeFa(s);
  // If the whole message is just a trigger, no name yet
  const stripped = n.replace(TRIGGER_STRIP, " ").replace(/\s+/g, " ").trim();
  if (!stripped || stripped.length < 2) return null;
  // Recover a readable slice: drop trigger words from the original
  let raw = s
    .replace(/^\s*\/[a-zA-Z0-9_]+(?:@[\w]+)?\s*/, "")
    .replace(/فال\s*(ابجد|اسم|نام)/g, "")
    .replace(/ابجد/g, "")
    .replace(/عدد\s*(اسم|نام)/g, "")
    .replace(/حروف\s*ابجد/g, "")
    .replace(/\b(اسمم|نامم|اسم|نام)\b/g, "")
    .replace(/[:：\-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Keep only Persian/Arabic letters, spaces, ZWNJ
  raw = raw.replace(/[^\u0600-\u06FF\u200c\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!raw || raw.length < 2) return null;
  return raw;
}
