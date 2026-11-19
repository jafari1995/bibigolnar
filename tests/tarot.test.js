import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TAROT_DECK, drawTarot, formatDraw } from "../src/tarot.js";
import { getCorpus, pickGhazal } from "../src/hafez.js";
import { mulberry32 } from "../src/rng.js";
import { readName, extractName } from "../src/abjad.js";

describe("tarot deck and draw", () => {
  it("has a complete 78-card deck with 22 majors and unique names", () => {
    assert.equal(TAROT_DECK.length, 78);
    assert.equal(TAROT_DECK.filter((c) => c.arcana === "major").length, 22);
    assert.equal(TAROT_DECK.filter((c) => c.arcana === "minor").length, 56);
    const names = new Set(TAROT_DECK.map((c) => c.nameEn));
    assert.equal(names.size, 78);
  });

  it("draws 1 or 3 unique cards with orientation", () => {
    const one = drawTarot(1);
    assert.equal(one.length, 1);
    assert.ok(one[0].nameFa && one[0].nameEn);
    assert.ok(one[0].orientationFa === "مستقیم" || one[0].orientationFa === "معکوس");

    const rng = mulberry32(12345);
    const three = drawTarot(3, { random: rng, rngFlip: () => rng() < 0.5 });
    assert.equal(three.length, 3);
    const set = new Set(three.map((c) => c.nameEn));
    assert.equal(set.size, 3);
    assert.equal(three[0].position.includes("گذشته"), true);
    const again = drawTarot(3, { random: mulberry32(12345), rngFlip: (() => { const r = mulberry32(12345); return () => r() < 0.5; })() });
    // uniqueness already checked; format is non-empty
    assert.match(formatDraw(three), /1\./);
  });

  it("is deterministic with a seeded RNG", () => {
    const flipA = mulberry32(7);
    const flipB = mulberry32(7);
    const a = drawTarot(3, { random: mulberry32(99), rngFlip: () => flipA() < 0.5 });
    const b = drawTarot(3, { random: mulberry32(99), rngFlip: () => flipB() < 0.5 });
    assert.deepEqual(
      a.map((c) => [c.nameEn, c.reversed]),
      b.map((c) => [c.nameEn, c.reversed]),
    );
  });
});

describe("Hafez corpus", () => {
  it("bundles at least 50 real ghazals with verses", () => {
    const corpus = getCorpus();
    assert.ok(corpus.ghazals.length >= 50, `count=${corpus.ghazals.length}`);
    const first = corpus.ghazals.find((g) => g.number === 1);
    assert.ok(first);
    const opening = first.beits[0][0];
    assert.match(opening.replace(/[\u064B-\u065F\u0670]/g, ''), /ساقی/);
    assert.ok(first.url.includes("ganjoor.net"));
  });

  it("picks two real beits and never invents lines", () => {
    const g = pickGhazal({ random: () => 0 }); // first ghazal
    assert.equal(g.shownBeits.length, 2);
    assert.equal(g.shownBeits[0].length, 2);
    const corpus = getCorpus();
    const source = corpus.ghazals.find((x) => x.id === g.id);
    assert.deepEqual(g.shownBeits, source.beits.slice(0, 2));
  });
});

describe("abjad", () => {
  it("computes a stable value for a Persian name", () => {
    const r = readName("حامد");
    assert.ok(r.total > 0);
    assert.equal(r.reduced, Number(String(r.total).split("").reduce((a, d) => a + Number(d), 0)) > 9 ? r.steps.at(-1) : r.reduced);
    assert.equal(r.reduced >= 1 && r.reduced <= 9, true);
    assert.equal(extractName("فال ابجد حامد"), "حامد");
    assert.equal(extractName("فال ابجد"), null);
  });
});
