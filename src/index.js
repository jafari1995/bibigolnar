/**
 * Cloudflare Worker entry: Telegram webhook for بی‌بی گلنار.
 * Returns 200 quickly and finishes the fortune with ctx.waitUntil.
 */
import { processUpdate } from "./handler.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response("بی‌بی گلنار حاضر است 🔮", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, POST" } });
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (!env?.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const task = processUpdate(update, env, globalThis.fetch).catch((err) => {
      console.error("processUpdate failed:", err);
    });

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(task);
      return new Response("OK", { status: 200 });
    }

    await task;
    return new Response("OK", { status: 200 });
  },
};

export { processUpdate };
