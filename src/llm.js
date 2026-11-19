import {
  OPENROUTER_URL,
  LLM_TIMEOUT_MS,
  LLM_MAX_TOKENS,
  getModels,
} from "./config.js";
import { SYSTEM_PROMPT } from "./persona.js";

/**
 * Narrate a fortune via OpenRouter (OpenAI-compatible chat completions).
 * Tries free models in order. Returns null on total failure so the caller
 * can fall back to canned in-character text.
 */
export async function narrateFortune(
  { user, imageDataUrl = null, system = SYSTEM_PROMPT, validate = null },
  env,
  fetchImpl = fetch,
) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return null;
  const models = getModels(env);
  let lastErr = null;
  let lastInvalid = null;
  const started = Date.now();
  for (const model of models) {
    if (Date.now() - started > 14_000) break; // stay inside the Worker's waitUntil budget
    try {
      const text = await callOpenRouter(
        { model, system, user, imageDataUrl, apiKey: key },
        fetchImpl,
      );
      if (text && (!validate || validate(text))) return { text, model };
      if (text) lastInvalid = { text, model, invalid: true };
    } catch (err) {
      lastErr = err;
      // If the model rejected the image, retry this model once without it.
      if (imageDataUrl && /image|multimodal|vision|400/i.test(String(err?.message || err))) {
        try {
          const text = await callOpenRouter(
            { model, system, user, imageDataUrl: null, apiKey: key },
            fetchImpl,
          );
          if (text && (!validate || validate(text))) return { text, model };
      if (text) lastInvalid = { text, model, invalid: true };
        } catch (err2) {
          lastErr = err2;
        }
      }
    }
  }
  if (lastErr) console.error("OpenRouter failed:", lastErr.message || lastErr);
  return lastInvalid;
}

export async function callOpenRouter(
  { model, system, user, imageDataUrl, apiKey, maxTokens = LLM_MAX_TOKENS, timeoutMs = LLM_TIMEOUT_MS },
  fetchImpl = fetch,
) {
  const userContent = imageDataUrl
    ? [
        { type: "text", text: user },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : user;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/bibi-golnar-bot",
        "X-Title": "Bibi Golnar Fal Bot",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.error?.message || body?.error || res.statusText;
      throw new Error(`OpenRouter ${res.status} (${model}): ${msg}`);
    }
    const text = stripReasoning(extractMessageText(body));
    if (!text) throw new Error("empty LLM content");
    return text;
  } finally {
    clearTimeout(t);
  }
}

/** One short real-or-mocked connectivity check. */
export async function pingModel(env, fetchImpl = fetch, prompt = "فقط یک کلمه بنویس: سلام") {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, skipped: true, reason: "no-key" };
  const model = getModels(env)[0];
  try {
    const text = await callOpenRouter(
      {
        model,
        system: "You are a test helper. Reply with a single short Persian word.",
        user: prompt,
        apiKey: key,
        maxTokens: 24,
        timeoutMs: 12_000,
      },
      fetchImpl,
    );
    return { ok: true, model, text };
  } catch (err) {
    return { ok: false, model, error: String(err.message || err) };
  }
}

function extractMessageText(body) {
  const choice = body?.choices?.[0] || {};
  const msg = choice.message || {};
  let content = msg.content ?? choice.text ?? msg.reasoning ?? "";
  if (Array.isArray(content)) {
    content = content
      .map((part) => (typeof part === "string" ? part : part?.text || part?.content || ""))
      .join("");
  }
  content = String(content || "").trim();
  if (content) return content;
  return "";
}


function stripReasoning(text) {
  let t = String(text || "");
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "");
  t = t.replace(/<think>[\s\S]*$/gi, "");
  t = t.replace(/^Here'?s a thinking process:[\s\S]*?(?:\n\n(?:Final(?: answer| response)?:\s*)?)/i, "");
  return t.trim();
}
