import { hashString, mulberry32, tehranDateISO } from "./rng.js";

const MOODS = [
  { fa: "گشایش آرام", hint: "کارها با نرمی جلو می‌روند؛ عجله نکن." },
  { fa: "خبری در راه", hint: "گوش‌ات را تیز کن؛ یک پیغام کوچک مهم است." },
  { fa: "روز دل", hint: "مهربانی‌ات امروز بیشتر برمی‌گردد." },
  { fa: "احتیاط شیرین", hint: "حرف را سبک بگو، تصمیم بزرگ را بگذار برای فردا." },
  { fa: "دستِ پر", hint: "اگر یک کار ناتمام را تمام کنی، روزت شیرین می‌شود." },
  { fa: "سفر کوتاه", hint: "حتی یک پیاده‌روی کوچک هوا را عوض می‌کند." },
  { fa: "خانه و سفره", hint: "برکت امروز از اهل خانه‌ات می‌آید." },
  { fa: "بختِ دیرآشنا", hint: "کسی یا چیزی از گذشته سر در می‌آورد." },
  { fa: "صبرِ دریا", hint: "موج هست، اما غرق نمی‌شوی؛ یک نفس عمیق." },
  { fa: "روزِ نخل", hint: "ریشه‌ات محکم است؛ میوه کمی دیرتر می‌رسد." },
  { fa: "کلید گم‌شده", hint: "جواب همان‌جاست که کمتر نگاه می‌کنی." },
  { fa: "خنده اجباری", hint: "یک مسئله جدی را با شوخی نرم‌تر می‌کنی." },
];

const COLORS = ["فیروزه‌ای", "شفقی", "نخل‌سبز", "خاکی گرم", "سفیدِ کتان", "طلایی کم‌رنگ", "آبی خلیج"];
const ADVICE = [
  "یک لیوان آب خنک بخور، بعد حرف بزن.",
  "امروز قول بزرگ نده؛ کار کوچک را درست انجام بده.",
  "به یک نفر که دوستش داری سلام گرم بده.",
  "اگر دل‌ت گرفت، برو نزدیک پنجره بایست.",
  "پول خردت را بی‌حساب خرج نکن.",
  "راز مردم را نگه دار تا راز خودت هم سالم بماند.",
];

export function dailyFortune(userId, date = new Date()) {
  const day = tehranDateISO(date);
  const seed = hashString(`${userId || "anon"}:${day}`);
  const rnd = mulberry32(seed);
  const mood = MOODS[Math.floor(rnd() * MOODS.length)];
  const color = COLORS[Math.floor(rnd() * COLORS.length)];
  const advice = ADVICE[Math.floor(rnd() * ADVICE.length)];
  return { day, mood: mood.fa, hint: mood.hint, color, advice, seed };
}
