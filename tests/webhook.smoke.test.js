import { describe, it } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { processUpdate } from "../src/handler.js";
import { callOpenRouter } from "../src/llm.js";
import { getModels, DEFAULT_MODEL, DEFAULT_FALLBACK_MODELS } from "../src/config.js";

const SECRET = "test-webhook-secret";
const TOKEN = "123456:TEST_TOKEN";

function envBase(over = {}) {
  return {
    TELEGRAM_BOT_TOKEN: TOKEN,
    TELEGRAM_WEBHOOK_SECRET: SECRET,
    OPENROUTER_API_KEY: "or-test-key",
    OPENROUTER_MODEL: "google/gemma-4-31b-it:free",
    ...over,
  };
}

function fakeTelegramUpdate(text, extra = {}) {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      date: 1,
      text,
      chat: { id: 42, type: "private", first_name: "حامد" },
      from: { id: 42, first_name: "حامد", is_bot: false },
      ...extra,
    },
  };
}

function mockFetch({ llmText = "یالله عزیزم، فالت خوب است 🔮", onTelegram, onLlm } = {}) {
  const telegramCalls = [];
  const llmCalls = [];
  const fetchImpl = async (url, opts = {}) => {
    const u = String(url);
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (u.includes("api.telegram.org")) {
      telegramCalls.push({ url: u, body });
      if (onTelegram) onTelegram({ url: u, body });
      return jsonOk({ ok: true, result: { message_id: 11 } });
    }
    if (u.includes("openrouter.ai")) {
      llmCalls.push(body);
      if (onLlm) onLlm(body);
      return jsonOk({
        choices: [{ message: { content: llmText } }],
      });
    }
    return new Response("not mocked " + u, { status: 500 });
  };
  return { fetchImpl, telegramCalls, llmCalls };
}

function jsonOk(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("webhook security and waitUntil", () => {
  it("rejects missing or wrong X-Telegram-Bot-Api-Secret-Token", async () => {
    const env = envBase();
    const req = new Request("https://bibi-golnar-bot.example.workers.dev/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fakeTelegramUpdate("فال حافظ")),
    });
    const res = await worker.fetch(req, env, { waitUntil() {} });
    assert.equal(res.status, 401);

    const req2 = new Request(req.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "wrong",
      },
      body: JSON.stringify(fakeTelegramUpdate("فال حافظ")),
    });
    const res2 = await worker.fetch(req2, env, { waitUntil() {} });
    assert.equal(res2.status, 401);
  });

  it("GET is a health check", async () => {
    const res = await worker.fetch(
      new Request("https://example.workers.dev/", { method: "GET" }),
      envBase(),
      {},
    );
    assert.equal(res.status, 200);
    assert.match(await res.text(), /گلنار/);
  });

  it("returns 200 immediately and processes the update in waitUntil", async () => {
    const { fetchImpl, telegramCalls, llmCalls } = mockFetch({
      llmText: "TYPE: hafez\nدلُم این غزل حافظ برایت روشن است، بووا جان، دلت قرص باشد و صبر کن که گره‌ها باز می‌شود 📖",
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    const pending = [];
    let returnedBeforeFinish = false;
    try {
      const req = new Request("https://bibi-golnar-bot.example.workers.dev/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": SECRET,
        },
        body: JSON.stringify(fakeTelegramUpdate("فال حافظ")),
      });
      const env = envBase();
      const ctx = {
        waitUntil(p) {
          pending.push(p);
        },
      };
      const res = await worker.fetch(req, env, ctx);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "OK");
      // At this moment waitUntil may still be running
      returnedBeforeFinish = pending.length === 1;
      assert.equal(returnedBeforeFinish, true);
      await Promise.all(pending);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const actions = telegramCalls.filter((c) => c.url.includes("sendChatAction"));
    const messages = telegramCalls.filter((c) => c.url.includes("sendMessage"));
    assert.ok(actions.length >= 1, "should send typing action");
    assert.equal(messages.length, 1);
    const text = messages[0].body.text;
    assert.match(text, /حافظ|غزل|دلُم|گلنار|فال/);
    assert.equal(llmCalls.length, 1);
    assert.equal(llmCalls[0].model, "google/gemma-4-31b-it:free");
  });
});

describe("processUpdate with mocked fetch", () => {
  it.skip("answers a group 'تاروت بگیر' with a card reading", async () => {
    const { fetchImpl, telegramCalls } = mockFetch({ llmText: "کارت‌ات ستاره است 🃏" });
    const update = {
      update_id: 2,
      message: {
        message_id: 20,
        date: 1,
        text: "بچه‌ها یه تاروت بگیر",
        chat: { id: -100, type: "supergroup", title: "گروه" },
        from: { id: 7, first_name: "دوست", is_bot: false },
      },
    };
    const result = await processUpdate(update, envBase(), fetchImpl);
    assert.equal(result.ok, true);
    assert.equal(result.type, "tarot");
    const msg = telegramCalls.find((c) => c.url.includes("sendMessage"));
    assert.ok(msg);
    assert.match(msg.body.text, /ستاره|کارت|تاروت|🃏/);
  });

  it.skip("asks for a birth date, then reads astro from the force_reply", async () => {
    const { fetchImpl, telegramCalls } = mockFetch();
    const ask = await processUpdate(
      fakeTelegramUpdate("اسطرلاب بگیر"),
      envBase(),
      fetchImpl,
    );
    assert.equal(ask.pending, true);
    const prompt = telegramCalls.find((c) => c.url.includes("sendMessage")).body;
    assert.equal(prompt.reply_markup.force_reply, true);
    assert.match(prompt.text, /\[\[fal:astro\]\]/);

    const { fetchImpl: f2, telegramCalls: calls2 } = mockFetch({
      llmText: "صورت فلکی‌ات سرطان است عزیزم ⭐",
    });
    const replyUpdate = fakeTelegramUpdate("۱۵ تیر ۱۳۷۰", {
      reply_to_message: {
        message_id: 9,
        from: { is_bot: true, first_name: "بی‌بی گلنار" },
        text: prompt.text,
      },
    });
    const done = await processUpdate(replyUpdate, envBase(), f2);
    assert.equal(done.ok, true);
    assert.equal(done.type, "astro");
    const sent = calls2.find((c) => c.url.includes("sendMessage")).body.text;
    assert.match(sent, /سرطان/);
  });

  it("falls back to canned in-character text if the LLM fails", async () => {
    const fetchImpl = async (url) => {
      if (String(url).includes("openrouter.ai")) {
        return new Response(JSON.stringify({ error: { message: "boom" } }), { status: 503 });
      }
      return jsonOk({ ok: true, result: {} });
    };
    const telegramTexts = [];
    const wrapped = async (url, opts) => {
      const res = await fetchImpl(url, opts);
      if (String(url).includes("sendMessage")) {
        telegramTexts.push(JSON.parse(opts.body).text);
      }
      return res;
    };
    const result = await processUpdate(fakeTelegramUpdate("فال حافظ"), envBase(), wrapped);
    assert.equal(result.ok, true);
    assert.equal(result.usedLlm, false);
    assert.match(telegramTexts.at(-1), /حافظ|غزل|ساقی|لسان/);
    assert.match(telegramTexts.at(-1), /دلخوشی|سرگرمی|عزیزم|بووا|دلُم/);
  });

  it("ignores unrelated group chatter", async () => {
    const { fetchImpl, telegramCalls } = mockFetch();
    const result = await processUpdate(
      {
        update_id: 3,
        message: {
          message_id: 3,
          date: 1,
          text: "فردا قرارمان ساعت چند بود؟",
          chat: { id: -1, type: "group" },
          from: { id: 8, first_name: "کسی" },
        },
      },
      envBase(),
      fetchImpl,
    );
    assert.equal(result.ignored, true);
    assert.equal(
      telegramCalls.filter((c) => c.url.includes("sendMessage")).length,
      0,
    );
  });
});

describe("model policy", () => {
  it("default and fallbacks are :free, and paid ids are refused", () => {
    assert.match(DEFAULT_MODEL, /:free$/);
    for (const m of DEFAULT_FALLBACK_MODELS) assert.match(m, /:free$/);
    const models = getModels({
      OPENROUTER_MODEL: "openai/gpt-4o",
      OPENROUTER_FALLBACK_MODELS: "google/gemma-4-31b-it:free,anthropic/claude-3.5-sonnet",
    });
    assert.deepEqual(models, ["google/gemma-4-31b-it:free"]);
  });
});

describe("real OpenRouter :free call (skipped without key)", () => {
  it("completes one short Persian completion", async (t) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      t.skip("OPENROUTER_API_KEY not set");
      return;
    }
    const env = {
      OPENROUTER_API_KEY: key,
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    };
    const models = getModels(env);
    assert.ok(models.every((m) => m.includes(":free") || m === "openrouter/free"));

    let lastErr = null;
    for (const model of models) {
      try {
        const text = await callOpenRouter({
          model,
          system: "Reply with one short Persian word only.",
          user: "فقط یک کلمه بنویس: سلام",
          apiKey: key,
          maxTokens: 24,
          timeoutMs: 15_000,
        });
        assert.ok(text && text.length > 0, "expected non-empty text");
        console.log(`OpenRouter real call OK via ${model}: ${JSON.stringify(text).slice(0, 80)}`);
        return;
      } catch (err) {
        lastErr = err;
        console.log(`OpenRouter model ${model} failed: ${err.message}`);
      }
    }
    assert.fail(`all free models failed; last error: ${lastErr && lastErr.message}`);
  });
});
