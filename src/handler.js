import {
  detectIntent,
  intentFromCallback,
  detectPendingFromReply,
  isGreeting,
} from "./trigger.js";
import { pickGhazal, formatGhazal } from "./hafez.js";
import { drawTarot, formatDraw } from "./tarot.js";
import { readingFromDate } from "./zodiac.js";
import { readName, extractName } from "./abjad.js";
import { drawCoffeeSymbols, formatSymbols } from "./coffee.js";
import { drawYesNo, extractQuestion } from "./yesno.js";
import { dailyFortune } from "./daily.js";
import { narrateFortune } from "./llm.js";
import {
  startText,
  helpText,
  askText,
  mainKeyboard,
  factsPrompt,
  canned,
  genericMenuText,
  greetingText,
  softErrorText,
  DISCLAIMER,
} from "./persona.js";
import {
  sendChatAction,
  sendMessage,
  answerCallbackQuery,
  downloadPhotoDataUrl,
  isPrivateChat,
} from "./telegram.js";

/**
 * Process a Telegram update (message or callback_query).
 * Designed to run inside ctx.waitUntil on Cloudflare Workers.
 */
export async function processUpdate(update, env, fetchImpl = fetch) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

  if (update.callback_query) {
    return handleCallback(update.callback_query, env, fetchImpl);
  }
  const msg = update.message || update.edited_message;
  if (!msg) return { ignored: true };
  return handleMessage(msg, env, fetchImpl);
}

async function handleCallback(cq, env, fetchImpl) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = cq.message?.chat?.id;
  const intent = intentFromCallback(cq.data);
  await answerCallbackQuery(token, cq.id, fetchImpl);
  if (!intent || !chatId) return { ignored: true };
  const ctx = contextFromChat(cq.message.chat, cq.from, cq.message);
  if (intent.type === "help") {
    await reply(token, chatId, helpText(), fetchImpl, { menu: true });
    return { ok: true, type: "help" };
  }
  if (intent.type === "menu") {
    await reply(token, chatId, genericMenuText(), fetchImpl, { menu: true });
    return { ok: true, type: "menu" };
  }
  return performIntent(intent, ctx, env, fetchImpl);
}

async function handleMessage(msg, env, fetchImpl) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = msg.chat;
  const chatId = chat.id;
  const text = msg.text || msg.caption || "";
  const privateChat = isPrivateChat(chat);
  const ctx = contextFromChat(chat, msg.from, msg);

  const pendingType = msg.reply_to_message
    ? detectPendingFromReply(msg.reply_to_message.text || msg.reply_to_message.caption || "")
    : null;

  if (pendingType) {
    const intent = { type: pendingType, rest: text, raw: text, fromPending: true };
    return performIntent(intent, ctx, env, fetchImpl);
  }

  const intent = detectIntent(text);

  if (intent.type === "start") {
    await reply(token, chatId, startText(), fetchImpl, { menu: true });
    return { ok: true, type: "start" };
  }
  if (intent.type === "help") {
    await reply(token, chatId, helpText(), fetchImpl, { menu: true });
    return { ok: true, type: "help" };
  }
  if (intent.type === "menu" || intent.type === "generic") {
    await reply(token, chatId, genericMenuText(), fetchImpl, { menu: true });
    return { ok: true, type: "menu" };
  }

  // Photo in a private chat with coffee/palm caption, or a bare photo after those words
  if (msg.photo && !intent.type) {
    if (privateChat) {
      await reply(
        token,
        chatId,
        "این عکس برای فال قهوه است یا کف دست، عزیزم؟ از دکمه‌ها بزن، یا زیرش بنویس قهوه / کف دست ☕✋",
        fetchImpl,
        { menu: true },
      );
      return { ok: true, type: "photo-ask" };
    }
    return { ignored: true };
  }

  if (intent.type) {
    return performIntent(intent, ctx, env, fetchImpl);
  }

  if (privateChat && isGreeting(text)) {
    await reply(token, chatId, greetingText(), fetchImpl, { menu: true });
    return { ok: true, type: "greeting" };
  }

  // In private chat, a bare date might be an astro follow-up even without force_reply.
  if (privateChat && text) {
    const reading = readingFromDate(text);
    if (reading.ok) {
      return performIntent({ type: "astro", rest: text, raw: text }, ctx, env, fetchImpl);
    }
  }

  return { ignored: true };
}

function contextFromChat(chat, from, msg) {
  return {
    chatId: chat.id,
    chat,
    from,
    userId: from?.id,
    firstName: from?.first_name || "",
    isPrivate: isPrivateChat(chat),
    message: msg,
    photo: msg?.photo,
    text: msg?.text || msg?.caption || "",
  };
}

async function performIntent(intent, ctx, env, fetchImpl) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const { chatId } = ctx;
  try {
    await sendChatAction(token, chatId, fetchImpl, "typing");

    if (intent.type === "astro") {
      const reading = readingFromDate(intent.rest || ctx.text || "");
      if (!reading.ok) {
        await reply(token, chatId, askText("astro"), fetchImpl, { forceReply: true });
        return { ok: true, type: "astro", pending: true };
      }
      return finish(env, ctx, "astro", { summary: reading.summary, parsed: reading.parsed, sign: reading.sign }, fetchImpl);
    }

    if (intent.type === "abjad") {
      const name = extractName(intent.rest || ctx.text || "");
      if (!name) {
        await reply(token, chatId, askText("abjad"), fetchImpl, { forceReply: true });
        return { ok: true, type: "abjad", pending: true };
      }
      return finish(env, ctx, "abjad", { reading: readName(name) }, fetchImpl);
    }

    if (intent.type === "yesno") {
      const question = extractQuestion(intent.rest || ctx.text || "");
      if (!question) {
        await reply(token, chatId, askText("yesno"), fetchImpl, { forceReply: true });
        return { ok: true, type: "yesno", pending: true };
      }
      return finish(env, ctx, "yesno", { question, answer: drawYesNo() }, fetchImpl);
    }

    if (intent.type === "coffee") {
      const symbols = drawCoffeeSymbols(3);
      let imageDataUrl = null;
      let fromPhoto = false;
      if (ctx.photo) {
        fromPhoto = true;
        imageDataUrl = await downloadPhotoDataUrl(token, ctx.photo, fetchImpl).catch(() => null);
      }
      if (!ctx.photo && !intent.fromPending && intent.fromCallback) {
        // Offer a photo, but still do an imaginary reading so the user isn't left hanging? 
        // Task: if no photo, imaginary symbols. Proceed immediately.
      }
      return finish(env, ctx, "coffee", { symbols, fromPhoto }, fetchImpl, imageDataUrl);
    }

    if (intent.type === "palm") {
      if (!ctx.photo) {
        await reply(token, chatId, askText("palm"), fetchImpl, { forceReply: true });
        return { ok: true, type: "palm", pending: true };
      }
      const imageDataUrl = await downloadPhotoDataUrl(token, ctx.photo, fetchImpl).catch(() => null);
      return finish(env, ctx, "palm", { hasPhoto: true }, fetchImpl, imageDataUrl);
    }

    if (intent.type === "hafez") {
      const ghazal = pickGhazal();
      return finish(env, ctx, "hafez", { ghazal }, fetchImpl);
    }

    if (intent.type === "tarot") {
      const count = intent.tarotCount === 3 ? 3 : 1;
      const draw = drawTarot(count);
      return finish(env, ctx, "tarot", { draw, count }, fetchImpl);
    }

    if (intent.type === "daily") {
      const daily = dailyFortune(ctx.userId);
      return finish(env, ctx, "daily", { daily }, fetchImpl);
    }

    await reply(token, chatId, genericMenuText(), fetchImpl, { menu: true });
    return { ok: true, type: "menu" };
  } catch (err) {
    console.error("performIntent error:", err);
    await reply(token, chatId, softErrorText(), fetchImpl, { menu: true }).catch(() => null);
    return { ok: false, error: String(err.message || err) };
  }
}

async function finish(env, ctx, kind, facts, fetchImpl, imageDataUrl = null) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const prompt = buildUserPrompt(kind, facts, ctx);
  let text = null;
  const llm = await narrateFortune({ user: prompt, imageDataUrl }, env, fetchImpl);
  if (llm?.text) text = clip(llm.text);
  if (!text) text = canned(kind, facts);
  await reply(token, ctx.chatId, text, fetchImpl);
  return { ok: true, type: kind, usedLlm: Boolean(llm?.text), model: llm?.model || null };
}

function buildUserPrompt(kind, facts, ctx) {
  const name = ctx.firstName ? `نام کوچک کاربر: ${ctx.firstName}` : "";
  let factsText = "";
  switch (kind) {
    case "hafez":
      factsText = formatGhazal(facts.ghazal);
      break;
    case "tarot":
      factsText = `${facts.count} کارت:\n${formatDraw(facts.draw)}`;
      break;
    case "astro":
      factsText = `تاریخ شمسی: ${facts.summary.jalali}\nتاریخ میلادی: ${facts.summary.gregorian}\nصورت فلکی: ${facts.summary.signFa} (${facts.summary.signEn})`;
      break;
    case "coffee":
      factsText =
        (facts.fromPhoto ? "کاربر عکس فنجان فرستاده؛ اگر تصویر دیدی توصیفش کن، وگرنه از نمادهای زیر استفاده کن.\n" : "فنجان خیالی؛ عکس در کار نبود.\n") +
        formatSymbols(facts.symbols);
      break;
    case "abjad":
      factsText = `اسم: ${facts.reading.name}\nعدد ابجد: ${facts.reading.total}\nریشه: ${facts.reading.reduced}\nحال عدد: ${facts.reading.mood}`;
      break;
    case "daily":
      factsText = `تاریخ امروز (تهران): ${facts.daily.day}\nحال روز: ${facts.daily.mood}\nتوضیح: ${facts.daily.hint}\nرنگ: ${facts.daily.color}\nاندرز: ${facts.daily.advice}`;
      break;
    case "yesno":
      factsText = `سوال: ${facts.question}\nجواب از پیش انتخاب‌شده: ${facts.answer.fa} (${facts.answer.tone})`;
      break;
    case "palm":
      factsText = "کاربر عکس کف دست فرستاده. اگر تصویر را می‌بینی، بازیگوش و مهربان توصیفش کن (خطوط کلی، بدون ادعای علمی). اگر نمی‌بینی، یک فال کف دست کلی و گرم بگو.";
      break;
    default:
      factsText = "";
  }
  return factsPrompt(kind, factsText, name);
}

async function reply(token, chatId, text, fetchImpl, opts = {}) {
  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (opts.menu) payload.reply_markup = mainKeyboard();
  if (opts.forceReply) {
    payload.reply_markup = { force_reply: true, selective: true };
  }
  return sendMessage(token, payload, fetchImpl);
}

function clip(text, max = 3500) {
  const t = String(text).trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 10) + "…";
}

export { DISCLAIMER };
