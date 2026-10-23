import { generateDataset } from "../../data/generate";
import type { Channel, ChannelId, Customer, Dataset, MonthKey, Product, Transaction } from "./types";

/**
 * Single memoised copy of the Case #001 dataset. Generated deterministically
 * on first access (≈150 ms) — identical on server and client.
 */

let cache: Dataset | null = null;
let index: {
  product: Map<string, Product>;
  customer: Map<string, Customer>;
  channel: Map<ChannelId, Channel>;
  tx: Map<string, Transaction>;
  months: MonthKey[];
} | null = null;

export function getDataset(): Dataset {
  if (!cache) cache = generateDataset();
  return cache;
}

function getIndex() {
  if (!index) {
    const ds = getDataset();
    const months = [...new Set(ds.transactions.map((t) => t.month))].sort() as MonthKey[];
    index = {
      product: new Map(ds.products.map((p) => [p.id, p])),
      customer: new Map(ds.customers.map((c) => [c.id, c])),
      channel: new Map(ds.channels.map((c) => [c.id, c])),
      tx: new Map(ds.transactions.map((t) => [t.id, t])),
      months,
    };
  }
  return index;
}

export const productById = (id: string) => getIndex().product.get(id)!;
export const customerById = (id: string) => getIndex().customer.get(id)!;
export const channelById = (id: ChannelId) => getIndex().channel.get(id)!;
export const txById = (id: string) => getIndex().tx.get(id);
export const allMonths = () => getIndex().months;

export function txsByIds(ids: string[]): Transaction[] {
  const out: Transaction[] = [];
  for (const id of ids) {
    const t = txById(id);
    if (t) out.push(t);
  }
  return out;
}
