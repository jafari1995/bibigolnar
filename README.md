# بی‌بی گلنار — ربات فالگیر تلگرام / Bibi Golnar Telegram Bot

ربات فالگیر با لحن یک ننه‌ی بندری خوش‌زبان، برای چت خصوصی و گروه. استقرار روی **Cloudflare Workers** (wrangler).

A Persian fortune-teller Telegram bot in the voice of **بی‌بی گلنار**, a warm, funny Bandari grandma. Built as a **Cloudflare Worker**.

Bot username (when created): `@bibi_gonlar_bot`

---

## فارسی

### چه کارهایی بلدست؟

| نوع | در چت بگویید | دستور |
|---|---|---|
| فال حافظ (غزل واقعی از گنجور) | «فال حافظ» | `/hafez` |
| تاروت (۱ یا ۳ کارت از دست ۵۲+۲۲) | «تاروت بگیر»، «فال تاروت»، «سه کارت تاروت» | `/tarot` |
| اسطرلاب / طالع بینی | «اسطرلاب بگیر» + تاریخ تولد شمسی یا میلادی | `/astrolabe` |
| فال قهوه | «فال قهوه» (با عکس فنجان بهتر است) | `/coffee` |
| فال کف دست | «فال کف دست» + عکس | `/palm` |
| فال ابجد / اسم | «فال ابجد حامد» | `/abjad` |
| فال روزانه | «فال روزانه» | `/daily` |
| فال نخود (بله/نه) | «فال نخود آیا …؟» | `/yesno` |

در گروه فقط وقتی جواب می‌دهد که یکی از این عبارت‌ها (با املای غیررسمی، نیم‌فاصله، یا ي/ك عربی) در پیام باشد، یا از دستور اسلش استفاده شود. در چت خصوصی `/start` منوی دکمه می‌آورد.

تصادفی بودن کارت، غزل، نماد قهوه، جواب نخود و صورت فلکی **در خودِ کد** انجام می‌شود. مدل زبانی فقط روایت می‌کند و حق ساختن بیت حافظ یا عوض کردن کارت را ندارد. اگر مدل در دسترس نباشد، متن آماده‌ی هم‌لحن فرستاده می‌شود تا ربات ساکت نماند.

متن غزل‌ها از API عمومی [گنجور](https://ganjoor.net) آمده (اشعار کهن در مالکیت عمومی؛ حداقل ۸۸ غزل در `data/hafez.json`).

فال برای سرگرمی است، نه توصیه‌ی پزشکی، مالی یا حقوقی.

### پیش‌نیازها

1. حساب [Cloudflare](https://dash.cloudflare.com) و نصب [wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm i -g wrangler` یا `npx wrangler`
2. ربات در [@BotFather](https://t.me/BotFather): `/newbot`، بعد توکن را بردارید. برای گروه: Group Privacy را در صورت نیاز خاموش کنید (`/setprivacy` → Disable) تا ربات عبارت «فال» را در گروه ببیند.
3. کلید [OpenRouter](https://openrouter.ai/) — فقط مدل‌های `:free` صدا زده می‌شوند.

### متغیرها و رازها

در تولید، سه مقدار محرمانه را با دستور wrangler بگذارید (**مقدار را در فایل commit نکنید**):

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

`TELEGRAM_WEBHOOK_SECRET` را خودتان بسازید (یک رشته‌ی تصادفی بلند). همان مقدار بعداً به عنوان `secret_token` وب‌هوک تلگرام استفاده می‌شود.

مدل پیش‌فرض در `wrangler.toml` بخش `[vars]`:

- `OPENROUTER_MODEL` = `baidu/ernie-5.5-flash-preview:free`
- در صورت خطا به ترتیب: `nvidia/nemotron-3.5-lightning:free` سپس `google/gemma-4-31b-it:free`
- فقط شناسه‌های `:free` پذیرفته می‌شوند (مدل پولی رد می‌شود).

برای توسعه محلی فایل `.dev.vars` را از روی `.dev.vars.example` بسازید.

### استقرار (هنوز اجرا نشده؛ وقتی آماده بودید)

```bash
npx wrangler login
npx wrangler deploy
```

آدرس معمولاً شبیه این است:

`https://bibi-golnar-bot.<حساب-شما>.workers.dev/`

بعد وب‌هوک تلگرام را ثبت کنید (این کار را قبل از دیپلوی نکنید):

```bash
TELEGRAM_BOT_TOKEN="..." TELEGRAM_WEBHOOK_SECRET="..." WEBHOOK_URL="https://bibi-golnar-bot.<حساب-شما>.workers.dev/" npm run set-webhook
```

ورکر در `POST /` هدر `X-Telegram-Bot-Api-Secret-Token` را با `TELEGRAM_WEBHOOK_SECRET` می‌سنجد، بلافاصله `200 OK` می‌دهد، و پردازش فال را با `ctx.waitUntil` ادامه می‌دهد.

تست‌ها:

```bash
npm test
```

---

## English

Cloudflare Worker that serves as a Telegram webhook for a Persian fortune-teller persona («بی‌بی گلنار»). Fortune *randomness* (Hafez ghazal, tarot draw, zodiac, coffee symbols, yes/no, daily seed) is computed in code; the LLM only narrates, in character. If OpenRouter fails, canned in-character text is sent so the bot never goes silent.

Hafez verses are real public-domain texts bundled from the [Ganjoor API](https://api.ganjoor.net) (`data/hafez.json`, 88 ghazals). The worker bundles this JSON at build time.

### Env / secrets

| Name | Where | Required | Purpose |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `wrangler secret put` | yes | BotFather token |
| `OPENROUTER_API_KEY` | `wrangler secret put` | yes | OpenRouter key (free models only) |
| `TELEGRAM_WEBHOOK_SECRET` | `wrangler secret put` | yes | Shared secret for webhook header + `setWebhook` |
| `OPENROUTER_MODEL` | `[vars]` in `wrangler.toml` | no | Default `baidu/ernie-5.5-flash-preview:free` |
| `WEBHOOK_URL` | shell, for the setup script | after deploy | e.g. `https://bibi-golnar-bot.<account>.workers.dev/` |

Paid model ids are ignored. Built-in fallbacks (also `:free`): `nvidia/nemotron-3.5-lightning:free`, `google/gemma-4-31b-it:free`.

### Deploy later (do not do this until you are ready)

```bash
npx wrangler login
npx wrangler deploy
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=...   WEBHOOK_URL=https://bibi-golnar-bot.<account>.workers.dev/   npm run set-webhook
```

### Project layout

```
src/index.js          Worker fetch handler (webhook)
src/handler.js        Telegram update logic
src/llm.js            OpenRouter chat completions
src/hafez.js + data/hafez.json
src/tarot.js          78-card deck
src/jalali.js / zodiac.js
src/trigger.js        Phrase + command detection
scripts/set-webhook.mjs
wrangler.toml
tests/                node:test (trigger, jalali/zodiac, tarot, webhook smoke)
```

### Local tests

```bash
npm test
```

If `OPENROUTER_API_KEY` is present, one short real call is made to a `:free` model; otherwise that test is skipped.
