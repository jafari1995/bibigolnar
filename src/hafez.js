import corpus from "../data/hafez.json" with { type: "json" };
import { pick } from "./rng.js";

export function getCorpus() {
  return corpus;
}

/**
 * Pick a real public-domain Hafez ghazal and two couplets (never invent verses).
 * Default: the opening two beits of a randomly chosen ghazal.
 */
export function pickGhazal(opts = {}) {
  const list = corpus.ghazals;
  if (!list?.length) throw new Error("Hafez corpus is empty");
  const g =
    typeof opts.random === "function"
      ? list[Math.floor(opts.random() * list.length)]
      : pick(list);
  const shown = g.beits.slice(0, 2);
  return {
    id: g.id,
    number: g.number,
    title: g.title,
    url: g.url,
    source: g.source,
    shownBeits: shown,
    totalBeits: g.beits.length,
  };
}

export function formatBeits(beits) {
  return beits.map((beit) => beit.join("\n")).join("\n\n");
}

export function formatGhazal(g) {
  return `غزل شمارهٔ ${g.number} حافظ\n\n${formatBeits(g.shownBeits)}\n\nمنبع: ${g.url}`;
}
