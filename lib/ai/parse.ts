import type { ChannelId, DiscountBandId, MonthKey, MonthRange } from "../analytics/types";
import { allMonths, getDataset } from "../analytics/dataset";
import { prevMonth } from "../analytics/periods";
import type { Entities, EngineContext, IntentId, ParsedQuestion } from "./types";

/**
 * Rules-based question parser. Deliberately simple and inspectable:
 * keyword aliases → entities, ordered regex rules → intent.
 */

const PRODUCT_ALIASES: [RegExp, string][] = [
  [/\b(mugs?|kulhad)\b/, "P01"],
  [/\b(candles?|soy)\b/, "P02"],
  [/\b(incense|brass)\b/, "P03"],
  [/\b(cushions?|cushion covers?)\b/, "P04"],
  [/\b(planters?|terracotta)\b/, "P05"],
  [/\b(trays?|desk tray|mango)\b/, "P06"],
  [/\b(throws?|blankets?|handloom)\b/, "P07"],
  [/\b(diffusers?|reed)\b/, "P08"],
  [/\b(bed ?sheets?|sheets?|percale|bedding)\b/, "P09"],
  [/\b(dinner ?sets?|dinnerware|dinner)\b/, "P10"],
  [/\b(totes?|bags?)\b/, "P11"],
  [/\b(bowls?|serving bowl)\b/, "P12"],
];

const CHANNEL_ALIASES: [RegExp, ChannelId][] = [
  [/\b(website|web ?site|d2c|own site|shopify)\b/, "website"],
  [/\b(instagram|insta|ig)\b/, "instagram"],
  [/\b(marketplace|amazon|flipkart)\b/, "marketplace"],
  [/\b(quick ?commerce|qc|blinkit|zepto|instamart)\b/, "quickcommerce"],
];

const MONTH_NAMES: [RegExp, string][] = [
  [/\bjan(uary)?\b/, "01"], [/\bfeb(ruary)?\b/, "02"], [/\bmar(ch)?\b/, "03"], [/\bapr(il)?\b/, "04"],
  [/\bmay\b/, "05"], [/\bjun(e)?\b/, "06"], [/\bjul(y)?\b/, "07"], [/\baug(ust)?\b/, "08"],
  [/\bsep(t|tember)?\b/, "09"], [/\boct(ober)?\b/, "10"], [/\bnov(ember)?\b/, "11"], [/\bdec(ember)?\b/, "12"],
];

const BAND_ALIASES: [RegExp, DiscountBandId][] = [
  [/\bfull[- ]price\b/, "none"],
  [/\b35\s?%?\+?|\bdeep(est)? discount/, "deep"],
];

export function extractEntities(q: string, range: MonthRange): Entities {
  const text = q.toLowerCase();
  const productIds = PRODUCT_ALIASES.filter(([re]) => re.test(text)).map(([, id]) => id);
  const channels = CHANNEL_ALIASES.filter(([re]) => re.test(text)).map(([, id]) => id);
  const known = allMonths();
  const months: MonthKey[] = [];
  // Positional order matters for "compare July and September".
  const hits: { at: number; key: MonthKey }[] = [];
  for (const [re, mm] of MONTH_NAMES) {
    const m = re.exec(text);
    if (!m) continue;
    // "may" is also a verb — only accept it next to month-ish words or other months.
    if (mm === "05" && !/\b(in|of|for|during|vs|and|to|from|compare)\s+may\b|\bmay\s+(vs|and|to|2026)\b/.test(text)) continue;
    const key = known.find((k) => k.endsWith(`-${mm}`));
    if (key) hits.push({ at: m.index, key });
  }
  if (/\bthis month\b|\blatest month\b|\bcurrent month\b/.test(text)) hits.push({ at: text.search(/this month|latest month|current month/), key: range.to });
  if (/\b(last|previous|prior) month\b/.test(text)) {
    const p = prevMonth(range.to);
    if (p) hits.push({ at: text.search(/(last|previous|prior) month/), key: p });
  }
  hits.sort((a, b) => a.at - b.at);
  for (const h of hits) if (!months.includes(h.key)) months.push(h.key);

  const codes = getDataset().campaigns.map((c) => c.code);
  const coupons = codes.filter((c) => text.includes(c.toLowerCase()));
  const bands = BAND_ALIASES.filter(([re]) => re.test(text)).map(([, id]) => id);
  return { productIds, channels, months, coupons, bands };
}

const FOLLOW_UP = /^(why|how come|tell me more|more|go deeper|dig deeper|drill down|explain( that| this)?|and\??|what else|so\??|ok(ay)?\??|then\??|really\??|continue|next)\W*$/;

/** What to look at next when the user just says "why?" or "tell me more". */
const DEEPER: Record<IntentId, IntentId> = {
  "profit-decline": "product-margins",
  "product-margins": "product-detail",
  suspicious: "coupon-detail",
  "discount-effect": "customers",
  "month-compare": "profit-decline",
  actions: "suspicious",
  "revenue-increase": "discount-effect",
  channels: "channel-detail",
  "channel-detail": "product-margins",
  customers: "discount-effect",
  "product-detail": "suspicious",
  "month-profile": "month-compare",
  "coupon-detail": "customers",
  "band-detail": "product-margins",
  unknown: "profit-decline",
};

interface Rule {
  name: string;
  intent: IntentId;
  test: (t: string, e: Entities) => boolean;
}

const RULES: Rule[] = [
  { name: "asks for actions / recommendations", intent: "actions", test: (t) => /\b(actions?|recommend\w*|what should (i|we) do|how (do|can) (i|we) fix|next steps?|advice|to-?do)\b/.test(t) },
  { name: "asks for suspicious / loss-making orders", intent: "suspicious", test: (t) => /suspicious|anomal|fraud|weird|odd orders|strange|red flags?|loss[- ]making|lose money|losing money on|worst (orders|transactions)|leak/.test(t) },
  { name: "compares two months", intent: "month-compare", test: (t, e) => (/\bcompare|\bvs\.?\b|versus|month[- ]over[- ]month|\bmom\b/.test(t) && (e.months.length > 0 || /\bmonth/.test(t))) || e.months.length >= 2 },
  { name: "asks whether customers come back", intent: "customers", test: (t) => /repeat|retention|loyal|churn|come back|returning|cohorts?/.test(t) },
  { name: "mentions a coupon code", intent: "coupon-detail", test: (_t, e) => e.coupons.length > 0 },
  { name: "asks about discounts / promotions", intent: "discount-effect", test: (t) => /discount|coupon|promo|offers?\b|\bsale\b|\bcodes?\b|markdown/.test(t) },
  { name: "names a product", intent: "product-detail", test: (_t, e) => e.productIds.length > 0 },
  { name: "asks about products / SKUs", intent: "product-margins", test: (t) => /products?|skus?|items?|catalog|range of goods|best[- ]?sell/.test(t) },
  { name: "asks about customers / retention", intent: "customers", test: (t) => /customers?|repeat|retention|loyal|churn|come back|returning|cohorts?|buyers?/.test(t) },
  { name: "names a sales channel", intent: "channel-detail", test: (_t, e) => e.channels.length === 1 },
  { name: "asks about sales channels", intent: "channels", test: (t, e) => /channels?|where (do|should) (i|we) sell|platforms?/.test(t) || e.channels.length > 1 },
  { name: "asks why revenue grew", intent: "revenue-increase", test: (t) => /revenue|sales|growth|grow|increase|turnover|top ?line/.test(t) && !/profit|margin|broke|bottom/.test(t) },
  { name: "asks about profit / margin decline", intent: "profit-decline", test: (t) => /profit|margins?|broke|cash|losing|declin|bottom ?line|money|doesn'?t add up|earning/.test(t) },
  { name: "names a month", intent: "month-profile", test: (_t, e) => e.months.length === 1 },
];

export function parseQuestion(question: string, ctx: EngineContext): ParsedQuestion {
  const text = question.toLowerCase().trim();
  const entities = extractEntities(text, ctx.range);

  if (ctx.previous && FOLLOW_UP.test(text)) {
    return {
      intent: DEEPER[ctx.previous.intent],
      entities: ctx.previous.entities,
      followUp: true,
      rule: `follow-up on "${ctx.previous.intent}" → going one level deeper`,
    };
  }

  for (const r of RULES) {
    if (r.test(text, entities)) return { intent: r.intent, entities, followUp: false, rule: r.name };
  }

  // Short follow-ups that only change an entity: "what about instagram?", "and august?"
  if (ctx.previous && /^(what about|how about|and|same for|now)\b/.test(text)) {
    return { intent: ctx.previous.intent, entities: { ...ctx.previous.entities, ...nonEmpty(entities) }, followUp: true, rule: "follow-up with a new subject" };
  }

  return { intent: "unknown", entities, followUp: false, rule: "no rule matched" };
}

function nonEmpty(e: Entities): Partial<Entities> {
  const out: Partial<Entities> = {};
  (Object.keys(e) as (keyof Entities)[]).forEach((k) => {
    if (e[k].length) (out as Record<string, unknown>)[k] = e[k];
  });
  return out;
}
