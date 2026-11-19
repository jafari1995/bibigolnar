import { pick } from "./rng.js";
import { normalizeFa } from "./normalize.js";

export const YESNO_ANSWERS = [
  { id: "yes", fa: "بله", tone: "روشن و امیدوار" },
  { id: "yes-soft", fa: "بله، اما با حوصله", tone: "مثبتِ شرطی" },
  { id: "no", fa: "نه", tone: "صمیمی اما صریح" },
  { id: "no-soft", fa: "الان نه", tone: "منفیِ مهربان" },
  { id: "maybe", fa: "هنوز معلوم نیست", tone: "معلق، باید کمی صبر" },
];

export function drawYesNo(opts = {}) {
  if (typeof opts.random === "function") {
    const i = Math.floor(opts.random() * YESNO_ANSWERS.length);
    return YESNO_ANSWERS[i];
  }
  return pick(YESNO_ANSWERS);
}

const STRIP =
  /فال\s*نخود|نخود|بله\s*(یا|و)\s*نه|اره\s*(یا|و)\s*نه|آره\s*(یا|و)\s*نه|yes\s*or\s*no|سوال[مـ]?|سؤال[مـ]?/g;

export function extractQuestion(text) {
  let s = String(text || "").trim();
  s = s.replace(/^\s*\/[a-zA-Z0-9_]+(?:@[\w]+)?\s*/, "");
  const n = normalizeFa(s).replace(STRIP, " ").replace(/\s+/g, " ").trim();
  if (!n || n.length < 3) return null;
  // If almost nothing remains besides short filler, treat as missing
  if (/^(بگیر|بگو|کن|کنید|لطفا|خواهش)$/.test(n)) return null;
  s = s
    .replace(/فال\s*نخود/g, "")
    .replace(/نخود\s*(بگیر|بگو)?/g, "")
    .replace(/بله\s*(یا|و)\s*نه/g, "")
    .replace(/آره\s*(یا|و)\s*نه/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length >= 3 ? s : null;
}
