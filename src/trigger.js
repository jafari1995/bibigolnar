import { normalizeMessage, stripCommand } from "./normalize.js";

/**
 * Fortune kinds the bot can perform.
 * @typedef {"hafez"|"tarot"|"astro"|"coffee"|"abjad"|"daily"|"yesno"|"palm"|"menu"|"help"|"start"|"generic"} FortuneKind
 */

const COMMANDS = {
  start: "start",
  help: "help",
  menu: "menu",
  fal: "generic",
  fortune: "generic",
  hafez: "hafez",
  haafiz: "hafez",
  tarot: "tarot",
  astro: "astro",
  astrolabe: "astro",
  zodiac: "astro",
  coffee: "coffee",
  abjad: "abjad",
  name: "abjad",
  daily: "daily",
  yesno: "yesno",
  nokhod: "yesno",
  palm: "palm",
};

/** More specific patterns first. */
const PATTERNS = [
  { type: "help", re: /(?:^|\s)(?:راهنما|کمک)(?:\s|$)/ },
  {
    type: "hafez",
    re: /فال\s*حافظ|غزل\s*حافظ|حافظ\s*(?:بگیر|بگير|بگو|کن|كون)|لسان\s*الغیب|لسانالغیب/,
  },
  {
    type: "tarot",
    re: /تاروت|tarot|کارت\s*(?:تاروت|پیشگویی)|سه\s*کارت|يك\s*کارت\s*تاروت|یک\s*کارت\s*تاروت/,
  },
  {
    type: "astro",
    re: /اسطرلاب|اصطرلاب|استرلاب|استرلاب|طالع\s*بینی|طالعبینی|زایچه|صورت\s*فلکی|ماه\s*تول[دذ]|تاریخ\s*تول[دذ]|تولد[مـ]?\s*(?:چیست|چیه)|ستاره\s*شناسی/,
  },
  {
    type: "coffee",
    re: /فال\s*قهوه|فنجان|فنجون|قهوه\s*(?:بگیر|بگير|بگو)/,
  },
  {
    type: "palm",
    re: /کف\s*دست|کفدست|کف\s*بینی|کفبینی|خط\s*دست|کف\s*خوانی/,
  },
  {
    type: "abjad",
    re: /ابجد|فال\s*(?:اسم|نام)|عدد\s*(?:اسم|نام)|حروف\s*ابجد|اعداد\s*اسم/,
  },
  {
    type: "yesno",
    re: /فال\s*نخود|نخود\s*(?:بگیر|بگير)|بله\s*(?:یا|و)\s*نه|اره\s*(?:یا|و)\s*نه|آره\s*(?:یا|و)\s*نه|yes\s*or\s*no/,
  },
  {
    type: "daily",
    re: /فال\s*(?:روزانه|امروز|روز)|امروز\s*(?:چه\s*)?فال|horoscope/,
  },
  {
    type: "generic",
    re: /(?:^|\s)(?:یه|يک|یک|يه)?\s*فال(?:[یي]|و|م|ت)?\s*(?:بگیر|بگير|بگيرم|بگیرم|بگيريد|بگيريد|بکن|كن|کن)?(?:\s|$)|(?:^|\s)فال(?:\s|$)/,
  },
];

export function parseSlashCommand(text) {
  const raw = String(text || "").trim();
  const m = raw.match(/^\/([a-zA-Z0-9_]+)(?:@[\w]+)?(?:\s+([\s\S]*))?$/);
  if (!m) return null;
  const name = m[1].toLowerCase();
  const rest = (m[2] || "").trim();
  const type = COMMANDS[name];
  if (!type) return { type: null, command: name, rest, unknown: true };
  return { type, command: name, rest, unknown: false };
}

/**
 * Detect the user's requested fortune type.
 * @returns {{ type: FortuneKind|null, command?: string, rest?: string, tarotCount?: number, raw: string }}
 */
export function detectIntent(text) {
  const raw = String(text || "");
  const cmd = parseSlashCommand(raw);
  if (cmd && !cmd.unknown) {
    const intent = { type: cmd.type, command: cmd.command, rest: cmd.rest, raw };
    if (cmd.type === "tarot") intent.tarotCount = inferTarotCount(raw) || 1;
    return intent;
  }

  const n = normalizeMessage(raw);
  if (!n) return { type: null, raw };

  for (const { type, re } of PATTERNS) {
    if (re.test(n)) {
      const intent = { type, rest: stripCommand(raw), raw };
      if (type === "tarot") intent.tarotCount = inferTarotCount(n) || 1;
      return intent;
    }
  }
  return { type: null, raw };
}

export function inferTarotCount(text) {
  const n = normalizeMessage(text);
  if (/سه|3|۳|three/.test(n) && /کارت|تاروت|tarot/.test(n)) return 3;
  if (/سه\s*تایی|گسترده|کراس|صلیب/.test(n)) return 3;
  return 1;
}

/** True when this message should trigger a fortune / menu in a group chat. */
export function shouldTriggerInChat(text) {
  const intent = detectIntent(text);
  if (!intent.type) return false;
  if (intent.type === "start" || intent.type === "help" || intent.type === "menu") return true;
  return true;
}

export const CALLBACK_TYPES = {
  "fal:hafez": "hafez",
  "fal:tarot1": "tarot",
  "fal:tarot3": "tarot",
  "fal:astro": "astro",
  "fal:coffee": "coffee",
  "fal:abjad": "abjad",
  "fal:daily": "daily",
  "fal:yesno": "yesno",
  "fal:palm": "palm",
  "fal:menu": "menu",
  "fal:help": "help",
};

export function intentFromCallback(data) {
  const type = CALLBACK_TYPES[data];
  if (!type) return null;
  const intent = { type, raw: data, fromCallback: true };
  if (data === "fal:tarot3") intent.tarotCount = 3;
  if (data === "fal:tarot1") intent.tarotCount = 1;
  return intent;
}

/** Markers embedded in force_reply prompts so the next reply can be routed statelessly. */
export const PENDING_MARKERS = {
  astro: "[[fal:astro]]",
  abjad: "[[fal:abjad]]",
  yesno: "[[fal:yesno]]",
  coffee: "[[fal:coffee]]",
  palm: "[[fal:palm]]",
};

export function detectPendingFromReply(replyText) {
  const t = String(replyText || "");
  for (const [type, marker] of Object.entries(PENDING_MARKERS)) {
    if (t.includes(marker)) return type;
  }
  // Fallback if the invisible marker was stripped: look at the question wording.
  const n = normalizeMessage(t);
  if (!n) return null;
  if (/تاریخ\s*تول[دذ]|اسطرلاب|طالع/.test(n)) return "astro";
  if (/اسم|ابجد/.test(n)) return "abjad";
  if (/سوالت|سؤالت|نخود|بله یا نه/.test(n)) return "yesno";
  if (/فنجان|قهوه/.test(n)) return "coffee";
  if (/کف\s*دست|کفدست|عکس\s*دست/.test(n)) return "palm";
  return null;
}

export function isGreeting(text) {
  const n = normalizeMessage(text);
  return /^(سلام|درود|هی|های|hello|hi|سلام علیکم|سلامم|صبح بخیر|عصر بخیر|شب بخیر|چطوری|خوبی)(\s|$)/.test(n);
}
