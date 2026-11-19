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

export function buildSmartPrompt({ text, quoted, quotedIsBot, firstName, hasPhoto }, m) {
  const parts = [];
  parts.push(`پیام کاربر${firstName ? ` (${firstName})` : ""}: «${text || (hasPhoto ? "[فقط یک عکس فرستاده]" : "")}»`);
  if (quoted && quotedIsBot) parts.push(`(برای زمینه) کاربر دارد به این پیام قبلی خودت جواب می‌دهد: «${quoted.slice(0, 300)}»`);
  else if (quoted) parts.push(`کاربر به پیام کس دیگری ریپلای کرده؛ اگر فال خواست، موضوع/نیت فال همین پیام است: «${quoted.slice(0, 600)}»`);
  if (hasPhoto) parts.push("کاربر یک عکس هم فرستاده (احتمالاً فنجان قهوه یا کف دست). اگر تصویر را می‌بینی از آن استفاده کن.");
  parts.push(`
از روی پیام بفهم کاربر چه می‌خواهد. هیچ‌وقت از کاربر نخواه دستور خاصی بزند یا دکمه‌ای انتخاب کند.
- فقط وقتی فال بگیر که کاربر واقعاً فال/طالع/تاروت/حافظ/قهوه/اسطرلاب و مانند این‌ها خواسته، یا تاریخ تولد یا عکس فنجان/کف دست داده، یا سوالی درباره‌ی آینده/بخت پرسیده. اگر فال خواست ولی نوعش را نگفت، حافظ بگیر.
- اگر فقط تشکر، تعریف، سلام، خداحافظی، شوخی یا گپ بود (مثل «دمت گرم»، «مرسی»، «خیلی خوب بود»)، TYPE: chat بزن و فقط یک تا سه جمله‌ی کوتاه و گرم با لحن بی‌بی جواب بده؛ فال نگیر و از داده‌های زیر استفاده نکن.

داده‌های از پیش قرعه‌کشی‌شده (فقط از همین‌ها استفاده کن، چیزی از خودت نساز):
[hafez] ${formatGhazal(m.ghazal)}
[tarot] سه کارت (اگر کاربر یک کارت خواست فقط اولی را بگو):\n${formatDraw(m.tarot)}
[astro] ${m.date ? `تاریخ تولد: ${m.date.summary.jalali} (${m.date.summary.gregorian}) — صورت فلکی: ${m.date.summary.signFa} (${m.date.summary.signEn})` : "تاریخ تولد در پیام پیدا نشد؛ اگر کاربر طالع خواست و تاریخ نداد، مهربان بپرس روز و ماه تولدش چیست (هر شکلی بنویسد قبول است)."}
[coffee] ${formatSymbols(m.coffee)}
[yesno] جواب قرعه: ${m.yesno.fa} (${m.yesno.tone})
[daily] حال امروز: ${m.daily.mood} — ${m.daily.hint} — رنگ: ${m.daily.color} — اندرز: ${m.daily.advice}
[abjad] ${m.abjad ? `اسم ${m.abjad.name}: عدد ابجد ${m.abjad.total}، ریشه ${m.abjad.reduced}، حال: ${m.abjad.mood}` : "اگر کاربر اسمی در پیامش گفت و فال اسم خواست، با حال و هوای کلی تفسیر کن."}

خروجی: خط اول دقیقاً «TYPE: <یکی از ${TYPES.join("|")}>» و از خط بعد فقط متن فال/جواب بی‌بی (۸۰ تا ۱۸۰ کلمه).
قوانین سخت: فقط و فقط فارسی بنویس، حتی یک کلمه یا حرف انگلیسی ننویس. فکر کردن، برنامه‌ریزی، شمارش کلمات یا توضیح درباره‌ی خروجی را ننویس؛ فقط خود جواب. هرگز سال تولد، سن، شغل، شهر یا هر چیزی را که کاربر صریحاً نگفته حدس نزن و به زبان نیاور.
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

const LATIN = /[A-Za-z]/;
function stripAllowed(t, firstName) {
  let x = String(t).replace(/\([^()\u0600-\u06FF]*[A-Za-z][^()\u0600-\u06FF]*\)/g, ""); // "(Strength)"
  if (firstName && LATIN.test(firstName)) x = x.split(firstName).join("");
  return x;
}
export function isCleanPersian(body, firstName) {
  return body.length > 40 && !LATIN.test(stripAllowed(body, firstName));
}
/** Last resort: drop any sentence that still has Latin letters (leaked model reasoning). */
export function scrubLatin(body, firstName) {
  const x = String(body).replace(/\([^()\u0600-\u06FF]*[A-Za-z][^()\u0600-\u06FF]*\)/g, "");
  return x
    .split("\n")
    .map((line) => line.split(/(?<=[.!?؟…])\s+/).filter((sen) => !LATIN.test(firstName ? sen.split(firstName).join("") : sen)).join(" "))
    .filter((line, i, arr) => line.trim() || (i > 0 && arr[i - 1].trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function composeReply(type, body, m) {
  if (type === "hafez") return `📖 ${formatGhazal(m.ghazal)}\n\n${body}`;
  return body;
}

export async function smartFortune({ text, quoted, quotedIsBot = false, ctx, imageDataUrl, env, fetchImpl }) {
  const m = drawMaterials(ctx, `${text || ""} ${quoted || ""}`);
  let prompt = buildSmartPrompt({ text, quoted, quotedIsBot, firstName: ctx.firstName, hasPhoto: Boolean(ctx.photo) }, m);
  const guess = detectIntent(text || "").type;
  const hint = m.date ? "astro" : (TYPES.includes(guess) ? guess : (guess === "generic" ? "hafez" : null));
  if (hint) prompt += `\n\nنکته: از کلمات پیام به نظر می‌رسد کاربر «${hint}» می‌خواهد${m.date ? " (تاریخ تولد داده، پس طالع‌بینی/اسطرلاب بگیر)" : ""}؛ مگر اینکه واضحاً چیز دیگری خواسته باشد.`;
  const validate = (t) => {
    if (!/TYPE\s*[:：]\s*[a-z]+/i.test(String(t))) return false;
    const { body } = parseSmartOutput(t);
    return isCleanPersian(body, ctx.firstName);
  };
  const llm = await narrateFortune({ user: prompt, imageDataUrl, validate }, env, fetchImpl);
  if (llm?.text) {
    let { type, body } = parseSmartOutput(llm.text);
    if (llm.invalid) body = scrubLatin(body, ctx.firstName);
    if (body && body.length > 40) return { text: composeReply(type, body, m), type, model: llm.model };
  }
  // Fallback without LLM: keyword guess, default Hafez.
  const kind = detectIntent(text || "").type;
  const facts = {
    hafez: { ghazal: m.ghazal },
    tarot: { draw: m.tarot.slice ? m.tarot.slice(0, 1) : m.tarot, count: 1 },
    daily: { daily: m.daily },
    coffee: { symbols: m.coffee, fromPhoto: Boolean(ctx.photo) },
  };
  const wantsFal = Boolean(ctx.photo) || /(فال|تاروت|حافظ|اسطرلاب|طالع|قهوه|ابجد|نخود|کف دست)/.test(text || "");
  if (!wantsFal) return { text: "قربونت برم بووا 🌸 هر وقت دلت فال خواست، فقط بگو.", type: "chat", model: null };
  const k = facts[kind] ? kind : "hafez";
  return { text: canned(k, facts[k]), type: k, model: null };
}
