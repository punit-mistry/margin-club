/**
 * Domain types for MARGIN CLUB.
 * Money is always stored as integer rupees (INR). Dates are ISO strings
 * ("YYYY-MM-DD") so nothing depends on the viewer's timezone.
 */

export type MonthKey = `${number}-${string}`; // "2026-02"
export type ISODate = string; // "2026-02-14"

export type ChannelId = "website" | "instagram" | "marketplace" | "quickcommerce";

export interface Channel {
  id: ChannelId;
  name: string;
  short: string;
  /** Share of net revenue taken as fee / commission / gateway charge. */
  feeRate: number;
  /** Flat shipping cost borne by the brand per order (before heavy-item surcharge). */
  shippingBase: number;
  launched: ISODate;
}

export type ProductCategory =
  | "Ceramics"
  | "Textiles"
  | "Home Fragrance"
  | "Decor"
  | "Workspace"
  | "Garden"
  | "Accessories";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  /** List price in INR. */
  price: number;
  /** Landed unit cost (COGS) in INR. */
  unitCost: number;
  /** Heavy / bulky items carry a shipping surcharge. */
  heavy: boolean;
}

export interface Customer {
  id: string;
  name: string;
  city: string;
  acquiredOn: ISODate;
  acquisitionChannel: ChannelId;
  /** Discount % on the very first order. */
  acquisitionDiscount: number;
  acquisitionCoupon: string | null;
}

export interface OrderLine {
  productId: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

/** A single business transaction (one customer order). */
export interface Transaction {
  id: string;
  date: ISODate;
  month: MonthKey;
  time: string; // "HH:MM"
  customerId: string;
  channel: ChannelId;
  coupon: string | null;
  discountPct: number;
  lines: OrderLine[];
  /** Customer's nth order (1 = first purchase). */
  customerOrderNo: number;
  /** List-price value before discount. */
  gross: number;
  discount: number;
  /** Revenue actually collected: gross − discount. */
  net: number;
  cogs: number;
  shipping: number;
  packaging: number;
  fees: number;
  /** Contribution profit: net − cogs − shipping − packaging − fees. */
  profit: number;
}

export interface Dataset {
  business: {
    name: string;
    sector: string;
    currency: "INR";
    from: ISODate;
    to: ISODate;
  };
  products: Product[];
  customers: Customer[];
  channels: Channel[];
  campaigns: Campaign[];
  transactions: Transaction[];
}

export interface Campaign {
  code: string;
  pct: number;
  from: ISODate;
  to: ISODate;
  channels: ChannelId[];
  description: string;
  /** Applies only to a customer's first order. */
  newOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/* Derived metrics                                                     */
/* ------------------------------------------------------------------ */

export interface Totals {
  orders: number;
  units: number;
  gross: number;
  discount: number;
  net: number;
  cogs: number;
  shipping: number;
  packaging: number;
  fees: number;
  profit: number;
  /** profit / net, 0–1 */
  margin: number;
  /** discount / gross, 0–1 */
  discountRate: number;
  aov: number;
  discountedOrders: number;
  /** discountedOrders / orders */
  discountedShare: number;
  heavyDiscountOrders: number; // ≥ 25 %
  lossOrders: number;
}

export interface MonthMetrics extends Totals {
  month: MonthKey;
  label: string; // "Feb"
  newCustomers: number;
  repeatOrders: number;
}

export interface ProductMetrics {
  product: Product;
  units: number;
  net: number;
  profit: number;
  margin: number;
  avgDiscount: number;
  revenueShare: number;
  /** Margin at list price: (price − cost) / price */
  listMargin: number;
}

export interface ChannelMetrics extends Totals {
  channel: Channel;
  revenueShare: number;
  profitShare: number;
}

export type DiscountBandId = "none" | "low" | "mid" | "high" | "deep";

export interface DiscountBand {
  id: DiscountBandId;
  label: string;
  min: number; // inclusive
  max: number; // exclusive
}

export interface BandMetrics extends Totals {
  band: DiscountBand;
}

export interface MonthRange {
  from: MonthKey;
  to: MonthKey;
}

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type FlagId =
  | "loss-making"
  | "deep-discount"
  | "low-margin-discounted"
  | "fee-heavy-loss"
  | "welcome-reuse";

export interface Flag {
  id: FlagId;
  label: string;
  description: string;
}

export interface FlaggedTransaction {
  tx: Transaction;
  flags: FlagId[];
  /** Higher = more suspicious. Rupee loss + flag weight; transparent formula. */
  score: number;
}

export type EvidenceRef =
  | { kind: "month"; id: MonthKey }
  | { kind: "product"; id: string }
  | { kind: "channel"; id: ChannelId }
  | { kind: "band"; id: DiscountBandId }
  | { kind: "order"; id: string }
  | { kind: "cohort"; id: MonthKey };

/** A piece of evidence as surfaced to the user (canvas, drawer, AI). */
export interface Evidence {
  id: string; // "EV-07"
  title: string;
  ref?: EvidenceRef;
  /** Supporting transaction ids, for the drawer / CSV export. */
  orderIds: string[];
  note?: string;
}
