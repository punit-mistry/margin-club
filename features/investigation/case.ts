import type { InvestigationCase } from "./types";

export const CASE_001: InvestigationCase = {
  id: "case-001",
  code: "CASE #001",
  title: "The Discount Trap",
  business: "Ordinary Objects",
  brief:
    "A Mumbai D2C home-goods brand grew sales for eight straight months of promotions. Contribution profit went the other way. Find out why.",
  modes: [
    { id: "trap", n: "01", title: "The Discount Trap", short: "Discount trap", question: "Why is revenue up while profit is down?", exhibits: "A–E" },
    { id: "products", n: "02", title: "Product Profitability", short: "Products", question: "Which products sell well but keep almost nothing?", exhibits: "A–C" },
    { id: "customers", n: "03", title: "Customer Behaviour", short: "Customers", question: "Who comes back — and who only buys on sale?", exhibits: "A–D" },
    { id: "channels", n: "04", title: "Sales Channels", short: "Channels", question: "Where does each ₹100 of sales really go?", exhibits: "A–C" },
  ],
};
