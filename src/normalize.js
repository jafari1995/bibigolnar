/** Persian / Arabic text normalization for trigger matching and date parsing. */

const ARABIC_YEH = /[\u064A\u0649]/g; // ي ى
const ARABIC_KAF = /\u0643/g; // ك
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g; // آ أ إ ٱ
const TEH_MARBUTA = /[\u0629\u06C0]/g; // ة ۀ
const INVISIBLE = /[\u200c\u200d\u200b\u200e\u200f\ufeff\u00a0]/g;
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toAsciiDigits(s) {
  return String(s).replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p >= 0) return String(p);
    const a = ARABIC_DIGITS.indexOf(ch);
    if (a >= 0) return String(a);
    return ch;
  });
}

export function toPersianDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function normalizeFa(input) {
  if (!input) return "";
  return String(input)
    .replace(INVISIBLE, "")
    .replace(ARABIC_YEH, "ی")
    .replace(ARABIC_KAF, "ک")
    .replace(ALEF_VARIANTS, "ا")
    .replace(TEH_MARBUTA, "ه")
    .replace(/\u0624/g, "و") // ؤ
    .replace(/\u0626/g, "ی") // ئ
    .replace(/[ـ]/g, "")
    .replace(/[؟?؟]/g, " ")
    .replace(/[!.,،؛:…«»""()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Normalize then also strip command bot mention, e.g. /hafez@bot */
export function normalizeMessage(input) {
  return normalizeFa(input).replace(/@[\w]+/g, " ").replace(/\s+/g, " ").trim();
}

export function stripCommand(text) {
  return String(text || "")
    .replace(/^\s*\/([a-zA-Z0-9_]+)(?:@[\w]+)?\s*/, "")
    .trim();
}
