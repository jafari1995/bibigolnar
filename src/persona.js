import { PERSONA_NAME } from "./config.js";
import { formatBeits } from "./hafez.js";
import { formatDraw } from "./tarot.js";
import { formatSymbols } from "./coffee.js";
import { PENDING_MARKERS } from "./trigger.js";
import { toPersianDigits } from "./normalize.js";

export const SYSTEM_PROMPT = `تو «${PERSONA_NAME}» هستی؛ یک ننه‌ی فالگیر بندریِ گرم و بامزه از جنوب ایران (لحن بوشهر / بندرعباس). فقط فارسی حرف می‌زنی.

لحن:
- مهربان، شوخی‌دار، خودمانی. هرگز بدخواه، ترسناک، توهین‌آمیز یا قضاوت‌گر نباش.
- پیام‌ها کوتاه باشند (حدود ۸۰ تا ۱۶۰ کلمه)، با دو-سه ایموجی مناسب (🔮☕🃏⭐).
- کمی واژه‌های بندری و جنوبی استفاده کن که خوانا بمانند: بووا، هالو (فقط خودمانی و دوستانه، نه توهین)، عزیزم، دلُم، یالله، والله، جانم. افراط نکن.
- خودت را هوش مصنوعی معرفی نکن. تو بی‌بی گلناری.

قانون مهم:
- فقط همان فالی را روایت کن که در پیام کاربر آمده. بیت حافظ را از خودت نساز و عوض نکن. کارت تاروت، نماد قهوه، جواب بله/نه، عدد ابجد و صورت فلکی را تغییر نده.
- فال برای سرگرمی است؛ پیشگویی قطعی پزشکی، مالی یا حقوقی نده. اگر لازم شد یک اشاره‌ی سبک بکن که «این‌ها برای دلخوشی است».
- آیه و بیت فقط وقتی که در داده آمده باشد.`;

export const DISCLAIMER =
  "این‌ها همه برای دلخوشی و خنده است عزیزم، نه نسخه‌ی طبیب و نه حکم قاضی 🌿";

export function startText() {
  return (
    `سلام علیکم بووا 🌊🔮\n` +
    `من ${PERSONA_NAME}ام، ننه‌ی فالگیر این دور و بر. هر چی دلت خواست بنویس، خودم می‌فهمم چه فالی برایت بگیرم.\n\n` +
    `حافظ، تاروت، اسطرلاب، قهوه، ابجد، فال روزانه، نخود، کف دست… همه را بلدم.\n` +
    `مثلاً بگو «حافظ بگیر»، «یه تاروت بگیر»، «پونزده تیر به دنیا اومدم» یا عکس فنجانت را بفرست. توی گروه هم به پیامم ریپلای کن یا اسم فال را بیاور.`
  );
}

export function helpText() {
  return (
    `دلُم، این کارای من است 🔮\n\n` +
    `📖 فال حافظ — بگو «فال حافظ»\n` +
    `🃏 تاروت — «تاروت بگیر» یا «سه کارت تاروت»\n` +
    `⭐ اسطرلاب / طالع بینی — تاریخ تولد (شمسی یا میلادی)\n` +
    `☕ فال قهوه — با عکس فنجان بهتر؛ بی‌عکس هم بلدم\n` +
    `✋ فال کف دست — یک عکس از کف دستت بفرست\n` +
    `🔢 فال ابجد / اسم\n` +
    `🌞 فال روزانه\n` +
    `🫘 فال نخود (بله یا نه) — سوالت را بگو\n\n` +
    `دستورها: /start /help /hafez /tarot /astrolabe /coffee /abjad /daily /yesno /palm\n\n` +
    DISCLAIMER
  );
}

export function askText(type) {
  const marker = PENDING_MARKERS[type] || "";
  const map = {
    astro:
      `تاریخ تولدت را بگو عزیزم، تا اسطرلاب را برایت بچرخانم ⭐\n` +
      `شمسی یا میلادی، هر جور بلدی. مثلاً «۱۵ تیر ۱۳۷۰» یا «1991-07-06».\n${marker}`,
    abjad: `اسمت را بگو بووا تا حروف ابجدش را بشمارم 🔢\n${marker}`,
    yesno: `سوالت را بگو دلُم، تا نخود را بیندازم؛ جوابش بله است یا نه 🫘\n${marker}`,
    coffee:
      `اگر عکس فنجان قهوه‌ات را داری بفرست ☕ وگرنه همین‌جا برات یک فنجان خیالی می‌چینم.\n` +
      `اگر عکس می‌فرستی، همین پیام را ریپلای کن.\n${marker}`,
    palm: `یک عکس از کف دستت برایم بفرست عزیزم ✋ (همین پیام را ریپلای کن)\n${marker}`,
  };
  return map[type] || `یک کمی بیشتر بگو جانم.\n${marker}`;
}

export function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📖 فال حافظ", callback_data: "fal:hafez" },
        { text: "🃏 فال تاروت", callback_data: "fal:tarot1" },
      ],
      [
        { text: "🃏 تاروت سه‌کارت", callback_data: "fal:tarot3" },
        { text: "⭐ اسطرلاب", callback_data: "fal:astro" },
      ],
      [
        { text: "☕ فال قهوه", callback_data: "fal:coffee" },
        { text: "✋ فال کف دست", callback_data: "fal:palm" },
      ],
      [
        { text: "🌞 فال روزانه", callback_data: "fal:daily" },
        { text: "🔢 فال ابجد", callback_data: "fal:abjad" },
      ],
      [
        { text: "🫘 فال نخود", callback_data: "fal:yesno" },
        { text: "❓ راهنما", callback_data: "fal:help" },
      ],
    ],
  };
}

/** Build the user prompt that feeds already-chosen facts to the LLM. */
export function factsPrompt(kind, facts, extra = "") {
  const lines = [
    `نوع فال: ${kind}`,
    "این واقعیت‌ها از قبل در کد انتخاب شده‌اند. فقط روایت‌شان کن؛ عوض‌شان نکن:",
    facts,
  ];
  if (extra) lines.push(extra);
  lines.push("الان پیام فال را به لحن بی‌بی گلنار بنویس.");
  return lines.join("\n\n");
}

export function canned(kind, facts) {
  switch (kind) {
    case "hafez":
      return (
        `یالله دلُم، دیوان لسان‌الغیب را باز کردم 📖🔮\n\n` +
        `${formatGhazalSafe(facts.ghazal)}\n\n` +
        `بووا این بیت‌ها می‌گویند دلت یک گره‌ای دارد، اما راهش با صبر و نیت پاک باز می‌شود. عجله نکن؛ گاهی عشق اول آسان می‌نماید و بعد باید حوصله کرد. چشم‌ات روشن.\n\n` +
        DISCLAIMER
      );
    case "tarot":
      return (
        `کارت‌ها را روی صندوق چوبی‌ام پهن کردم 🃏\n\n` +
        `${formatDraw(facts.draw)}\n\n` +
        `والله این چینش می‌گوید حواست به انتخاب‌هایت باشد، اما ناامید نشو عزیزم. یک قدم آرام از یک تصمیم عجولانه بهتر است.\n\n` +
        DISCLAIMER
      );
    case "astro":
      return (
        `اسطرلاب را چرخاندم جانم ⭐\n` +
        `تولدت ${facts.summary.jalali}، برابر ${facts.summary.gregorian}.\n` +
        `صورت فلکی‌ات ${facts.summary.signFa} (${facts.summary.signEn}) است.\n\n` +
        `این طالع می‌گوید اگر صبور باشی، کارها به کام‌ات می‌چرخد. امروز مهربانی‌ات را از خودت دریغ نکن.\n\n` +
        DISCLAIMER
      );
    case "coffee": {
      const how = facts.fromPhoto
        ? "فنجان را نگاه کردم"
        : "یک فنجان خیالی برایت ریختم (عکس نبود بووا)";
      return (
        `${how} ☕\n${formatSymbols(facts.symbols)}\n\n` +
        `هالو جان، ته‌فنجان‌ات شلوغ است اما تاریک نیست. کمی احتیاط، کمی خبر خوش. قهوه‌ات را هم تا آخر بنوش.\n\n` +
        DISCLAIMER
      );
    }
    case "abjad":
      return (
        `اسم «${facts.reading.name}» را روی کاغذ کندم 🔢\n` +
        `عدد ابجد: ${toPersianDigits(facts.reading.total)} — ریشه: ${toPersianDigits(facts.reading.reduced)} (${facts.reading.mood}).\n\n` +
        `این عدد می‌گوید اسم‌ات با تو مهربان است، اگر خودت هم با خودت مهربان باشی. یالله مبارک باشد.\n\n` +
        DISCLAIMER
      );
    case "daily":
      return (
        `فال امروزت (${toPersianDigits(facts.daily.day)}) 🌞\n` +
        `حال روز: ${facts.daily.mood}\n` +
        `${facts.daily.hint}\n` +
        `رنگ روز: ${facts.daily.color}\n` +
        `حرف ننه: ${facts.daily.advice}\n\n` +
        DISCLAIMER
      );
    case "yesno":
      return (
        `نخود را انداختم بووا 🫘\n` +
        `سوالت: ${facts.question}\n` +
        `جواب: ${facts.answer.fa} (${facts.answer.tone})\n\n` +
        `این را هم بدان که نخود شوخی بلد است؛ خودت هم عقل‌ات را کنارش بگذار.\n\n` +
        DISCLAIMER
      );
    case "palm":
      return (
        `کف دست را دیدم عزیزم ✋\n` +
        `خط جان‌ات بلند است، خط دل‌ات کمی پرپیچ، و خط عقل می‌گوید عجله نکن. اگر عکس واضح نبود، باز هم برایت خیر می‌بینم؛ یک بار دیگر رو به نور بگیر و بفرست.\n\n` +
        DISCLAIMER
      );
    default:
      return `یالله عزیزم، بگو کدام فال را می‌خواهی تا برایت بگیرم 🔮\n\n` + DISCLAIMER;
  }
}

function formatGhazalSafe(g) {
  if (!g) return "";
  return `غزل شمارهٔ ${g.number} حافظ\n\n${formatBeits(g.shownBeits)}\n\nمنبع: ${g.url}`;
}

export function genericMenuText() {
  return `چه فالی دل‌ت می‌خواهد بووا؟ از دکمه‌ها یکی را بزن، یا بگو حافظ، تاروت، اسطرلاب… 🔮`;
}

export function greetingText() {
  return `سلام سلام عزیزم 🌊 من ${PERSONA_NAME}ام. فال می‌خواهی یا فقط سر زدی بگویی خوبی؟ اگر فال می‌خواهی از دکمه‌ها بزن.`;
}

export function softErrorText() {
  return `وای دلُم، یک لحظه نخ‌ام گره خورد. دوباره بگو چه فالی می‌خواهی، ننه درست‌اش می‌کند 🔮`;
}
