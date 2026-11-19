const API = "https://api.telegram.org";

export async function telegramCall(token, method, payload, fetchImpl = fetch) {
  const res = await fetchImpl(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const desc = data.description || res.statusText;
    throw new Error(`Telegram ${method} failed: ${desc}`);
  }
  return data.result;
}

export function sendChatAction(token, chatId, fetchImpl, action = "typing") {
  return telegramCall(token, "sendChatAction", { chat_id: chatId, action }, fetchImpl).catch(
    () => null,
  );
}

export function sendMessage(token, payload, fetchImpl) {
  return telegramCall(token, "sendMessage", payload, fetchImpl);
}

export function answerCallbackQuery(token, id, fetchImpl, text) {
  return telegramCall(
    token,
    "answerCallbackQuery",
    { callback_query_id: id, text, show_alert: false },
    fetchImpl,
  ).catch(() => null);
}

export async function downloadPhotoDataUrl(token, photoSizes, fetchImpl = fetch) {
  if (!photoSizes?.length) return null;
  // Mid-size file to stay within Worker memory / LLM limits (~a few hundred KB).
  const sorted = photoSizes.slice().sort((a, b) => (a.file_size || 0) - (b.file_size || 0));
  const mid = sorted.find((p) => (p.file_size || 0) >= 20_000 && (p.file_size || 0) <= 200_000) || sorted[Math.max(0, sorted.length - 2)] || sorted[sorted.length - 1];
  const file = await telegramCall(token, "getFile", { file_id: mid.file_id }, fetchImpl);
  if (!file?.file_path) return null;
  const res = await fetchImpl(`${API}/file/bot${token}/${file.file_path}`);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 700_000) return null;
  const b64 = bufferToBase64(buf);
  const mime = guessMime(file.file_path);
  return `data:${mime};base64,${b64}`;
}

function guessMime(path) {
  const p = String(path).toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export function chatIdFromUpdate(update) {
  return (
    update?.message?.chat?.id ??
    update?.callback_query?.message?.chat?.id ??
    update?.edited_message?.chat?.id ??
    null
  );
}

export function isPrivateChat(chat) {
  return chat?.type === "private";
}

export function isGroupChat(chat) {
  return chat?.type === "group" || chat?.type === "supergroup";
}

export async function setWebhook(token, url, secret, fetchImpl = fetch) {
  return telegramCall(
    token,
    "setWebhook",
    {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    },
    fetchImpl,
  );
}
