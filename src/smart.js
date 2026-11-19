// One-shot "smart" fortune: the LLM reads whatever the user wrote and picks the
// fitting fortune, using randomness pre-drawn in code (so verses/cards are real).
import { pickGhazal, formatGhazal } from "./hafez.js";
import { drawTarot, formatDraw } from "./tarot.js";
import { readingFromDate } from "./zodiac.js";
import { readName } from "./abjad.js";
import { drawCoffeeSymbols, formatSymbols } from "./coffee.js";
import { drawYesNo } from "./yesno.js";
import { dailyFortune } from "./daily.js";
import { narrateFortune } from "./llm.js";
import { canned } from "./persona.js";
import { detectIntent } from "./trigger.js";

const TYPES = ["hafez", "tarot", "astro", "coffee", "palm", "abjad", "daily", "yesno", "chat"];

export function drawMaterials(ctx, text) {
  const date = readingFromDate(text);
  return {
    ghazal: pickGhazal(),
    tarot: drawTarot(3),
    coffee: drawCoffeeSymbols(3),
    yesno: drawYesNo(),
    daily: dailyFortune(ctx.userId),
    date: date.ok ? date : null,
    abjad: ctx.firstName ? safe(() => readName(ctx.firstName)) : null,
  };
}

function safe(f) { try { return f(); } catch { return null; } }

export function buildSmartPrompt({ text, quoted, firstName, hasPhoto }, m) {
  const parts = [];
  parts.push(`پیام کاربر${firstName ? ` (${firstName})` : ""}: «${text || (hasPhoto ? "[فقط یک عکس فرستاده]" : "")}»`);
  if (quoted) parts.push(`کاربر به این پیام ریپلای کرده (موضوع/نیت فال می‌تواند همین باشد): «${quoted.slice(0, 600)}»`);
  if (hasPhoto) parts.push("کاربر یک عکس هم فرستاده (احتمالاً فنجان قهوه یا کف دست). اگر تصویر را می‌بینی از آن استفاده کن.");
  parts.push(`
از روی پیام بفهم کاربر چه می‌خواهد و مناسب‌ترین فال را بگیر. هیچ‌وقت از کاربر نخواه دستور خاصی بزند یا دکمه‌ای انتخاب کند. اگر معلوم نبود چه فالی، خودت یکی که بیشتر به حرفش می‌خورد انتخاب کن (پیش‌فرض: حافظ). اگر فقط سلام یا گپ بود، با لحن بی‌بی جواب کوتاه و گرم بده و پیشنهاد فال بده.

داده‌های از پیش قرعه‌کشی‌شده (فقط از همین‌ها استفاده کن، چیزی از خودت نساز):
[hafez] ${formatGhazal(m.ghazal)}
[tarot] سه کارت (اگر کاربر یک کارت خواست فقط اولی را بگو):\n${formatDraw(m.tarot)}
[astro] ${m.date ? `تاریخ تولد: ${m.date.summary.jalali} (${m.date.summary.gregorian}) — صورت فلکی: ${m.date.summary.signFa} (${m.date.summary.signEn})` : "تاریخ تولد در پیام پیدا نشد؛ اگر کاربر طالع خواست و تاریخ نداد، مهربان بپرس روز و ماه تولدش چیست (هر شکلی بنویسد قبول است)."}
[coffee] ${formatSymbols(m.coffee)}
[yesno] جواب قرعه: ${m.yesno.fa} (${m.yesno.tone})
[daily] حال امروز: ${m.daily.mood} — ${m.daily.hint} — رنگ: ${m.daily.color} — اندرز: ${m.daily.advice}
[abjad] ${m.abjad ? `اسم ${m.abjad.name}: عدد ابجد ${m.abjad.total}، ریشه ${m.abjad.reduced}، حال: ${m.abjad.mood}` : "اگر کاربر اسمی در پیامش گفت و فال اسم خواست، با حال و هوای کلی تفسیر کن."}

خروجی: خط اول دقیقاً «TYPE: <یکی از ${TYPES.join("|")}>» و از خط بعد فقط متن فال/جواب بی‌بی (۸۰ تا ۱۸۰ کلمه).
اگر TYPE حافظ بود بیت‌ها را دوباره ننویس (خودمان بالای متن می‌گذاریم)، فقط تفسیر کن. برای تاروت اسم کارت‌ها را بگو.`);
  return parts.join("\n");
}

export function parseSmartOutput(raw) {
  let s = String(raw || "").trim();
  let idx = -1;
  for (const mm of s.matchAll(/TYPE\s*[:：]\s*[a-z]+/gi)) idx = mm.index; // last TYPE line wins
  if (idx > 0) s = s.slice(idx); // drop any leaked reasoning before the TYPE line
  s = s.replace(/^\**\s*/, "");
  const m = s.match(/^TYPE\s*[:：]\s*([a-z]+)\**[^\n]*\n?/i);
  let type = "chat";
  let body = s;
  if (m) {
    type = TYPES.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "chat";
    body = s.slice(m[0].length).trim();
  }
  return { type, body };
}

export function composeReply(type, body, m) {
  if (type === "hafez") return `📖 ${formatGhazal(m.ghazal)}\n\n${body}`;
  return body;
}

export async function smartFortune({ text, quoted, ctx, imageDataUrl, env, fetchImpl }) {
  const m = drawMaterials(ctx, `${text || ""} ${quoted || ""}`);
  let prompt = buildSmartPrompt({ text, quoted, firstName: ctx.firstName, hasPhoto: Boolean(ctx.photo) }, m);
  const guess = detectIntent(text || "").type;
  const hint = m.date ? "astro" : (TYPES.includes(guess) ? guess : null);
  if (hint) prompt += `\n\nنکته: از کلمات پیام به نظر می‌رسد کاربر «${hint}» می‌خواهد${m.date ? " (تاریخ تولد داده، پس طالع‌بینی/اسطرلاب بگیر)" : ""}؛ مگر اینکه واضحاً چیز دیگری خواسته باشد.`;
  const validate = (t) => {
    if (!/TYPE\s*[:：]\s*[a-z]+/i.test(String(t))) return false;
    const { body } = parseSmartOutput(t);
    return body.length > 40 && (body.match(/[a-zA-Z]/g) || []).length < body.length * 0.2;
  };
  const llm = await narrateFortune({ user: prompt, imageDataUrl, validate }, env, fetchImpl);
  if (llm?.text) {
    const { type, body } = parseSmartOutput(llm.text);
    if (body) return { text: composeReply(type, body, m), type, model: llm.model };
  }
  // Fallback without LLM: keyword guess, default Hafez.
  const kind = detectIntent(text || "").type;
  const facts = {
    hafez: { ghazal: m.ghazal },
    tarot: { draw: m.tarot.slice ? m.tarot.slice(0, 1) : m.tarot, count: 1 },
    daily: { daily: m.daily },
    coffee: { symbols: m.coffee, fromPhoto: Boolean(ctx.photo) },
  };
  const k = facts[kind] ? kind : "hafez";
  return { text: canned(k, facts[k]), type: k, model: null };
}
