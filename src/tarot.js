import { pick, shuffle } from "./rng.js";

const MAJOR = [
  { id: 0, arcana: "major", en: "The Fool", fa: "دیوانه", up: "آغاز نو، جسارت، آزادی", rev: "بی‌احتیاطی، سردرگمی" },
  { id: 1, arcana: "major", en: "The Magician", fa: "جادوگر", up: "اراده، مهارت، شروع قدرت‌مند", rev: "فریب، استعداد هدررفته" },
  { id: 2, arcana: "major", en: "The High Priestess", fa: "کاهنه اعظم", up: "شهود، راز، سکوت دانا", rev: "نادیده گرفتن ندای درون" },
  { id: 3, arcana: "major", en: "The Empress", fa: "امپراتریس", up: "فراوانی، مهر، رشد", rev: "وابستگی، رکود خلاق" },
  { id: 4, arcana: "major", en: "The Emperor", fa: "امپراتور", up: "نظم، ثبات، اقتدار", rev: "سختی بی‌جا، کنترل زیاد" },
  { id: 5, arcana: "major", en: "The Hierophant", fa: "روحانی", up: "سنت، راهنمایی، ایمان", rev: "قید بی‌مورد، طغیان کور" },
  { id: 6, arcana: "major", en: "The Lovers", fa: "عشاق", up: "پیوند، انتخاب قلب، هماهنگی", rev: "دوگانگی، انتخاب سخت" },
  { id: 7, arcana: "major", en: "The Chariot", fa: "ارابه", up: "پیروزی، عزم، حرکت", rev: "راه بند آمده، جهت گم‌شده" },
  { id: 8, arcana: "major", en: "Strength", fa: "قدرت", up: "شجاعت نرم، خویشتن‌داری", rev: "تردید به خود، خشم" },
  { id: 9, arcana: "major", en: "The Hermit", fa: "گوشه‌نشین", up: "تأمل، خرد در خلوت", rev: "انزوای زیاد، گم‌کردن مسیر" },
  { id: 10, arcana: "major", en: "Wheel of Fortune", fa: "چرخ بخت", up: "چرخش حال، بخت تازه", rev: "مقاومت در برابر تغییر" },
  { id: 11, arcana: "major", en: "Justice", fa: "عدالت", up: "انصاف، پیامد درست", rev: "بی‌تعادلی، تصمیم ناعادلانه" },
  { id: 12, arcana: "major", en: "The Hanged Man", fa: "مرد آویخته", up: "نگاه نو، تسلیم دانا", rev: "معطل ماندن بیهوده" },
  { id: 13, arcana: "major", en: "Death", fa: "مرگ", up: "پایان یک فصل، پوست انداختن", rev: "چسبیدن به گذشته" },
  { id: 14, arcana: "major", en: "Temperance", fa: "اعتدال", up: "تعادل، شکیبایی، ترکیب خوب", rev: "زیاده‌روی، ناهماهنگی" },
  { id: 15, arcana: "major", en: "The Devil", fa: "شیطان", up: "دلبستگی، وسوسه، بند پنهان", rev: "رهایی از بند" },
  { id: 16, arcana: "major", en: "The Tower", fa: "برج", up: "فرو ریختن ساختگی‌ها، بیداری ناگهانی", rev: "ترس از تغییر لازم" },
  { id: 17, arcana: "major", en: "The Star", fa: "ستاره", up: "امید، شفا، الهام", rev: "کم‌نوری امید، بی‌باوری" },
  { id: 18, arcana: "major", en: "The Moon", fa: "ماه", up: "رؤیا، ابهام، ناخودآگاه", rev: "ترس بی‌پایه، فاش شدن راز" },
  { id: 19, arcana: "major", en: "The Sun", fa: "خورشید", up: "شادی، وضوح، موفقیت", rev: "غرور، شادی به تأخیر" },
  { id: 20, arcana: "major", en: "Judgement", fa: "داوری", up: "بیداری، بخشش، فراخوان تازه", rev: "سرزنش خود، تردید" },
  { id: 21, arcana: "major", en: "The World", fa: "جهان", up: "کمال، جمع‌بندی، سفر تمام", rev: "ناتمامی، حلقه باز" },
];

const SUITS = [
  { en: "Wands", fa: "چوبدست", theme: "شور، کار، آتش" },
  { en: "Cups", fa: "جام", theme: "دل، احساس، آب" },
  { en: "Swords", fa: "شمشیر", theme: "فکر، سخن، هوا" },
  { en: "Pentacles", fa: "سکه", theme: "ماده، کار و نان، خاک" },
];

const RANKS = [
  { n: 1, en: "Ace", fa: "آس", up: "هسته و آغاز این عنصر", rev: "تأخیر در شروع" },
  { n: 2, en: "Two", fa: "دوی", up: "زوج، انتخاب یا تعادل", rev: "دو دستگی" },
  { n: 3, en: "Three", fa: "سه‌ی", up: "رشد اولیه، همکاری", rev: "تأخیر در ثمر" },
  { n: 4, en: "Four", fa: "چهارِ", up: "ثبات یا وقفه", rev: "بی‌قراری، رکود" },
  { n: 5, en: "Five", fa: "پنجِ", up: "چالش، تنش سازنده", rev: "آشتی پس از درگیری" },
  { n: 6, en: "Six", fa: "ششِ", up: "گشایش، حرکت به جلو", rev: "نگاه به گذشته" },
  { n: 7, en: "Seven", fa: "هفتِ", up: "آزمون، پافشاری", rev: "خستگی یا عقب‌نشینی" },
  { n: 8, en: "Eight", fa: "هشتِ", up: "شتاب، مهارت، خبر", rev: "بن‌بست، پراکندگی" },
  { n: 9, en: "Nine", fa: "نه‌ی", up: "نزدیک به ثمر، انباشت", rev: "نگرانی زیاد" },
  { n: 10, en: "Ten", fa: "ده‌ی", up: "کمال این چرخه", rev: "بار گران، نیاز به رها کردن" },
  { n: 11, en: "Page", fa: "غلام", up: "پیام تازه، کنجکاوی", rev: "خبر دیر یا ناپختگی" },
  { n: 12, en: "Knight", fa: "شوالیه", up: "حرکت و پیگیری", rev: "شتاب‌زدگی یا درنگ" },
  { n: 13, en: "Queen", fa: "ملکه", up: "پختگی این عنصر", rev: "افراط یا درون‌گرایی زیاد" },
  { n: 14, en: "King", fa: "پادشاه", up: "استادی و مسئولیت", rev: "سخت‌گیری، سلطه" },
];

function buildDeck() {
  const deck = MAJOR.map((c) => ({
    ...c,
    nameFa: c.fa,
    nameEn: c.en,
  }));
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit.en}-${rank.n}`,
        arcana: "minor",
        suit: suit.en,
        suitFa: suit.fa,
        rank: rank.en,
        en: `${rank.en} of ${suit.en}`,
        fa: `${rank.fa} ${suit.fa}`,
        nameFa: `${rank.fa} ${suit.fa}`,
        nameEn: `${rank.en} of ${suit.en}`,
        up: `${rank.up} (${suit.theme})`,
        rev: `${rank.rev} (${suit.theme})`,
      });
    }
  }
  if (deck.length !== 78) throw new Error("Tarot deck must have 78 cards, got " + deck.length);
  return deck;
}

export const TAROT_DECK = buildDeck();

/**
 * Draw `count` unique cards (1 or 3), each independently upright or reversed.
 * Randomness is entirely in code; the LLM only narrates.
 * @param {number} count
 * @param {{ random?: () => number, rngFlip?: () => boolean }} [opts]
 */
export function drawTarot(count = 1, opts = {}) {
  const n = count === 3 ? 3 : 1;
  let cards;
  if (typeof opts.random === "function") {
    const copy = TAROT_DECK.slice();
    // deterministic Fisher-Yates
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(opts.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    cards = copy.slice(0, n);
  } else {
    cards = shuffle(TAROT_DECK).slice(0, n);
  }
  const positions = n === 3 ? ["گذشته / زمینه", "حال", "آینده / راهنما"] : ["کارت تو"];
  return cards.map((card, i) => {
    const reversed = typeof opts.rngFlip === "function" ? !!opts.rngFlip() : Math.random() < 0.5;
    return {
      position: positions[i],
      reversed,
      orientationFa: reversed ? "معکوس" : "مستقیم",
      nameFa: card.nameFa,
      nameEn: card.nameEn,
      arcana: card.arcana,
      meaning: reversed ? card.rev : card.up,
    };
  });
}

export function formatDraw(draw) {
  return draw
    .map(
      (c, i) =>
        `${i + 1}. ${c.position}: ${c.nameFa} (${c.nameEn}) — ${c.orientationFa}. کلید: ${c.meaning}`,
    )
    .join("\n");
}

export function randomOrientationCard() {
  return pick(TAROT_DECK);
}
