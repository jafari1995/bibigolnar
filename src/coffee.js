import { pick, shuffle } from "./rng.js";

export const COFFEE_SYMBOLS = [
  { fa: "پرنده", hint: "خبر یا سفر" },
  { fa: "حلقه", hint: "پیوند یا عهد" },
  { fa: "کوه", hint: "مانع، اما با پشتکار قابل‌عبور" },
  { fa: "مار", hint: "احتیاط از حرف دوپهلو" },
  { fa: "کشتی", hint: "جابه‌جایی، بخت از راه دور" },
  { fa: "درخت", hint: "رشد آرام و ریشه" },
  { fa: "کلید", hint: "راه‌حل نزدیک است" },
  { fa: "ماهی", hint: "روزی و جریان نرم" },
  { fa: "خانه", hint: "آرامش اهل خانه" },
  { fa: "جاده", hint: "مسیر تازه" },
  { fa: "قلب", hint: "دل‌مشغولی عاطفی" },
  { fa: "تاج", hint: "سربلندی کوچک یا بزرگ" },
  { fa: "چشم", hint: "نگاه دیگران؛ کمی حواس‌جمع باش" },
  { fa: "ستاره", hint: "امید و نیت برآورده" },
  { fa: "پل", hint: "آشتی یا وصل دو طرف" },
  { fa: "گل", hint: "مهربانی که به تو برمی‌گردد" },
  { fa: "قفس", hint: "حسی از گرفتاری که باز می‌شود" },
  { fa: "ماه", hint: "راز و رؤیا" },
  { fa: "اسب", hint: "شتاب و پیروزی" },
  { fa: "نامه", hint: "پیغام در راه" },
  { fa: "چاه", hint: "حرف نسنجیده را ته چاه بگذار" },
  { fa: "آینه", hint: "خودت را درست ببین" },
  { fa: "نان", hint: "برکت سفره" },
  { fa: "موج", hint: "دل‌شوره که فرو می‌نشیند" },
];

/** Random cup symbols for an imaginary (no photo) coffee reading. */
export function drawCoffeeSymbols(count = 3, opts = {}) {
  const n = Math.min(Math.max(count, 2), 4);
  let pool;
  if (typeof opts.random === "function") {
    pool = COFFEE_SYMBOLS.slice().sort(() => opts.random() - 0.5);
  } else {
    pool = shuffle(COFFEE_SYMBOLS);
  }
  return pool.slice(0, n);
}

export function formatSymbols(symbols) {
  return symbols.map((s, i) => `${i + 1}. ${s.fa} — ${s.hint}`).join("\n");
}

export function randomCoffeeLine() {
  return pick(COFFEE_SYMBOLS);
}
