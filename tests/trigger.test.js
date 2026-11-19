import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectIntent,
  shouldTriggerInChat,
  inferTarotCount,
  detectPendingFromReply,
  intentFromCallback,
  isGreeting,
  PENDING_MARKERS,
} from "../src/trigger.js";
import { normalizeFa } from "../src/normalize.js";

describe("normalizeFa", () => {
  it("maps Arabic yeh/kaf and strips ZWNJ", () => {
    // ي and ك (Arabic) + ZWNJ in کف‌دست
    const raw = "فال يك\u200cتاروت و كف\u200cدست";
    const n = normalizeFa(raw);
    assert.equal(n.includes("\u200c"), false);
    assert.match(n, /یک/);
    assert.match(n, /کفدست|کف دست/);
    assert.doesNotMatch(n, /ي|ك/);
  });
});

describe("detectIntent", () => {
  const cases = [
    ["فال حافظ", "hafez"],
    ["یه فال حافظ بگیر", "hafez"],
    ["فال‌حافظ", "hafez"], // zwnj
    ["لسان الغیب", "hafez"],
    ["یه فال تاروت بگیر", "tarot"],
    ["تاروت بگیر", "tarot"],
    ["یک تاروت بگير", "tarot"], // Arabic Yeh in بگیر maybe
    ["اسطرلاب بگیر", "astro"],
    ["یه اسطرلاب بگیر", "astro"],
    ["طالع بینی", "astro"],
    ["تاریخ تولدم چیه", "astro"],
    ["فال قهوه", "coffee"],
    ["فنجان قهوه", "coffee"],
    ["فال ابجد", "abjad"],
    ["فال اسم", "abjad"],
    ["فال روزانه", "daily"],
    ["فال امروز", "daily"],
    ["فال نخود", "yesno"],
    ["بله یا نه", "yesno"],
    ["فال کف دست", "palm"],
    ["کف‌بینی", "palm"],
    ["یه فال بگیر", "generic"],
    ["فال", "generic"],
    ["یک فال", "generic"],
    ["hello there", null],
    ["هوا چطوره", null],
  ];

  for (const [text, type] of cases) {
    it(`«${text}» → ${type}`, () => {
      assert.equal(detectIntent(text).type, type);
    });
  }

  it("accepts Arabic ي/ك variants of فال بگیر", () => {
    const text = "يه فال بگير"; // Arabic yeh
    assert.equal(detectIntent(text).type, "generic");
  });

  it("slash commands work, including @bot suffix", () => {
    assert.equal(detectIntent("/hafez").type, "hafez");
    assert.equal(detectIntent("/tarot@bibi_gonlar_bot 3").type, "tarot");
    assert.equal(detectIntent("/start").type, "start");
    assert.equal(detectIntent("/help").type, "help");
    assert.equal(detectIntent("/astrolabe").type, "astro");
    assert.equal(detectIntent("/coffee").type, "coffee");
    assert.equal(detectIntent("/abjad نام").type, "abjad");
    assert.equal(detectIntent("/daily").type, "daily");
    assert.equal(detectIntent("/yesno").type, "yesno");
    assert.equal(detectIntent("/palm").type, "palm");
    assert.equal(detectIntent("/fal").type, "generic");
  });

  it("is tolerant of informal spacing and punctuation", () => {
    assert.equal(detectIntent("بگو   یه   فال   تاروت!!!").type, "tarot");
    assert.equal(detectIntent("«فال حافظ»؟").type, "hafez");
  });
});

describe("tarot count and group trigger", () => {
  it("infers 3-card spreads", () => {
    assert.equal(inferTarotCount("سه کارت تاروت"), 3);
    assert.equal(inferTarotCount("تاروت ۳ تایی"), 3);
    assert.equal(inferTarotCount("تاروت بگیر"), 1);
    assert.equal(detectIntent("سه تا کارت تاروت بگیر").tarotCount, 3);
  });

  it("triggers in group chats only on fortune phrases", () => {
    assert.equal(shouldTriggerInChat("یه فال بگیر"), true);
    assert.equal(shouldTriggerInChat("اسطرلاب بگیر"), true);
    assert.equal(shouldTriggerInChat("سلام بچه‌ها"), false);
    assert.equal(shouldTriggerInChat("/hafez@bibi_gonlar_bot"), true);
  });
});

describe("pending reply + callbacks", () => {
  it("reads force_reply markers", () => {
    assert.equal(detectPendingFromReply(`تاریخ را بگو\n${PENDING_MARKERS.astro}`), "astro");
    assert.equal(detectPendingFromReply(`اسمت را بگو\n${PENDING_MARKERS.abjad}`), "abjad");
    assert.equal(detectPendingFromReply("تاریخ تولدت را برای اسطرلاب بگو"), "astro");
    assert.equal(detectPendingFromReply("unrelated bot text"), null);
  });

  it("maps inline keyboard callbacks", () => {
    assert.equal(intentFromCallback("fal:hafez").type, "hafez");
    assert.equal(intentFromCallback("fal:tarot3").tarotCount, 3);
    assert.equal(intentFromCallback("fal:tarot1").tarotCount, 1);
    assert.equal(intentFromCallback("fal:astro").type, "astro");
    assert.equal(intentFromCallback("nope"), null);
  });

  it("detects greetings in private chat", () => {
    assert.equal(isGreeting("سلام"), true);
    assert.equal(isGreeting("سلام خوبی"), true);
    assert.equal(isGreeting("فال حافظ"), false);
  });
});
