#!/usr/bin/env node
/**
 * Register the Telegram webhook for this Worker.
 * Do not run until the Worker is deployed and secrets are set.
 *
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... \
 *     WEBHOOK_URL=https://bibi-golnar-bot.<account>.workers.dev/ \
 *     node scripts/set-webhook.mjs
 */
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.FAL_TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const url = (process.env.WEBHOOK_URL || "").replace(/\/?$/, "/");

if (!token || !secret || !url.startsWith("https://")) {
  console.error(`Usage:
  TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... WEBHOOK_URL=https://bibi-golnar-bot.<subdomain>.workers.dev/ node scripts/set-webhook.mjs

Optional: DELETE=1 to remove the webhook.`);
  process.exit(1);
}

const endpoint = process.env.DELETE
  ? `https://api.telegram.org/bot${token}/deleteWebhook`
  : `https://api.telegram.org/bot${token}/setWebhook`;

const body = process.env.DELETE
  ? { drop_pending_updates: false }
  : {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    };

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
if (!data.ok) process.exit(1);
