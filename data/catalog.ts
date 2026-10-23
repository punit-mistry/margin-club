import type { Campaign, Channel, Product } from "../lib/analytics/types";

/**
 * Ordinary Objects — a fictional D2C lifestyle brand from Mumbai.
 * Prices and landed costs are in INR. Every figure in the app is derived
 * from these numbers plus the seeded simulation in ./generate.ts.
 */

export const BUSINESS = {
  name: "Ordinary Objects",
  sector: "D2C lifestyle & home goods, India",
  currency: "INR" as const,
  from: "2026-02-01",
  to: "2026-09-30",
};

export const PRODUCTS: Product[] = [
  { id: "P01", sku: "OO-MUG-KUL", name: "Kulhad Stoneware Mug", category: "Ceramics", price: 650, unitCost: 210, heavy: false },
  { id: "P02", sku: "OO-CDL-MON", name: "Monsoon Soy Candle", category: "Home Fragrance", price: 790, unitCost: 240, heavy: false },
  { id: "P03", sku: "OO-INC-BRS", name: "Brass Incense Stand", category: "Decor", price: 890, unitCost: 300, heavy: false },
  { id: "P04", sku: "OO-CSH-BLK", name: "Block-Print Cushion Cover", category: "Textiles", price: 1290, unitCost: 460, heavy: false },
  { id: "P05", sku: "OO-PLT-TER", name: "Terracotta Planter, Large", category: "Garden", price: 1150, unitCost: 430, heavy: true },
  { id: "P06", sku: "OO-TRY-MNG", name: "Mango Wood Desk Tray", category: "Workspace", price: 1890, unitCost: 690, heavy: false },
  { id: "P07", sku: "OO-THR-HDL", name: "Handloom Cotton Throw", category: "Textiles", price: 3450, unitCost: 1480, heavy: true },
  { id: "P08", sku: "OO-DIF-200", name: "Reed Diffuser 200 ml", category: "Home Fragrance", price: 1450, unitCost: 610, heavy: false },
  { id: "P09", sku: "OO-BED-IND", name: "Indigo Percale Bedsheet Set", category: "Textiles", price: 2990, unitCost: 1710, heavy: true },
  { id: "P10", sku: "OO-DIN-12P", name: "Everyday Dinner Set, 12 pc", category: "Ceramics", price: 4800, unitCost: 2920, heavy: true },
  { id: "P11", sku: "OO-TOT-CNV", name: "Canvas Market Tote", category: "Accessories", price: 590, unitCost: 230, heavy: false },
  { id: "P12", sku: "OO-BWL-SRV", name: "Ceramic Serving Bowl", category: "Ceramics", price: 1290, unitCost: 520, heavy: false },
];

export const CHANNELS: Channel[] = [
  { id: "website", name: "Website", short: "WEB", feeRate: 0.024, shippingBase: 96, launched: "2023-04-01" },
  { id: "instagram", name: "Instagram Shop", short: "IG", feeRate: 0.032, shippingBase: 96, launched: "2023-09-01" },
  { id: "marketplace", name: "Marketplace", short: "MKT", feeRate: 0.19, shippingBase: 72, launched: "2024-06-01" },
  { id: "quickcommerce", name: "Quick Commerce", short: "QC", feeRate: 0.28, shippingBase: 0, launched: "2026-06-01" },
];

/** Surcharge per heavy unit shipped by the brand (not applicable to quick commerce). */
export const HEAVY_SURCHARGE = 65;
export const PACKAGING_COST = 38;
export const QC_PACKAGING_COST = 14;

export const CAMPAIGNS: Campaign[] = [
  { code: "WELCOME10", pct: 10, from: "2026-02-01", to: "2026-09-30", channels: ["website", "instagram"], newOnly: true, description: "First-order welcome code" },
  { code: "SPRING15", pct: 15, from: "2026-03-12", to: "2026-03-22", channels: ["website", "instagram"], description: "Holi / spring refresh sale" },
  { code: "CREATOR20", pct: 20, from: "2026-04-01", to: "2026-09-30", channels: ["instagram"], description: "Creator partnership codes" },
  { code: "SUMMER25", pct: 25, from: "2026-05-15", to: "2026-06-15", channels: ["website", "instagram", "marketplace"], description: "Summer home refresh" },
  { code: "MKTDEAL", pct: 20, from: "2026-05-01", to: "2026-09-30", channels: ["marketplace"], description: "Seller-funded marketplace deal" },
  { code: "QCLAUNCH", pct: 20, from: "2026-06-01", to: "2026-09-30", channels: ["quickcommerce"], description: "Quick commerce launch offer" },
  { code: "MONSOON30", pct: 30, from: "2026-07-01", to: "2026-07-31", channels: ["website", "instagram", "marketplace"], description: "Monsoon sale" },
  { code: "FREEDOM40", pct: 40, from: "2026-08-08", to: "2026-08-17", channels: ["website", "instagram", "marketplace", "quickcommerce"], description: "Independence Day flash sale" },
  { code: "HOME35", pct: 35, from: "2026-08-25", to: "2026-09-30", channels: ["website", "instagram", "marketplace"], description: "Pre-festive home edit" },
];

export const FIRST_NAMES = [
  "Aarav", "Ananya", "Ishaan", "Meera", "Kabir", "Diya", "Vihaan", "Saanvi", "Arjun", "Myra",
  "Rohan", "Kavya", "Aditya", "Tara", "Neel", "Zoya", "Reyansh", "Aanya", "Dev", "Ira",
  "Farhan", "Nisha", "Siddharth", "Pooja", "Kunal", "Riya", "Harsh", "Sana", "Varun", "Leela",
  "Omkar", "Gauri", "Yash", "Aditi", "Rahul", "Fatima", "Manav", "Shreya", "Nikhil", "Tanvi",
];

export const LAST_INITIALS = "ABCDGHJKMNPRSTVY".split("");

export const CITIES = [
  "Mumbai", "Pune", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad",
  "Jaipur", "Goa", "Kochi", "Indore", "Chandigarh", "Lucknow", "Gurugram", "Noida",
];
