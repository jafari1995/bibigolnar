/**
 * Runtime config. Secrets come only from env bindings — never hard-coded.
 * On Cloudflare Workers, pass the Worker `env` into getEnv/getModels.
 */
export const DEFAULT_MODEL = "baidu/ernie-5.5-flash-preview:free";

/** Tried in order after the primary model if it fails or times out. All :free. */
export const DEFAULT_FALLBACK_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free",
];

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const LLM_TIMEOUT_MS = 9_000;
export const LLM_MAX_TOKENS = 420;

export const PERSONA_NAME = "بی‌بی گلنار";
export const BOT_USERNAME_HINT = "bibi_gonlar_bot";

function fallbackProcessEnv() {
  try {
    return typeof process !== "undefined" && process.env ? process.env : {};
  } catch {
    return {};
  }
}

export function getModels(env = fallbackProcessEnv()) {
  const primary = String(env.OPENROUTER_MODEL || DEFAULT_MODEL).trim();
  const extra = String(env.OPENROUTER_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fallbacks = extra.length ? extra : DEFAULT_FALLBACK_MODELS;
  const seen = new Set();
  const list = [];
  for (const id of [primary, ...fallbacks]) {
    if (!id || seen.has(id)) continue;
    // Refuse paid models — the account has a tight credit cap.
    if (!id.includes(":free") && id !== "openrouter/free") continue;
    seen.add(id);
    list.push(id);
  }
  if (!list.length) list.push(DEFAULT_MODEL);
  return list;
}

export function getEnv(env = fallbackProcessEnv()) {
  return {
    telegramToken: env.TELEGRAM_BOT_TOKEN || "",
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET || "",
    openrouterKey: env.OPENROUTER_API_KEY || "",
    models: getModels(env),
    webhookUrl: env.WEBHOOK_URL || "",
  };
}
