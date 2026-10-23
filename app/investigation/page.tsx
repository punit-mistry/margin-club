import type { Metadata } from "next";
import { Workspace } from "@/features/investigation/workspace";
import { shareMetadata } from "@/lib/site";

const DESCRIPTION = "Open the books on a fictional D2C brand: evidence canvas, supporting transactions and a local analysis engine that shows its working.";

export const metadata: Metadata = {
  title: "Case #001 — The Discount Trap",
  description: DESCRIPTION,
  ...shareMetadata({ title: "Case #001 is open — The Discount Trap · MARGIN CLUB", description: DESCRIPTION, path: "/investigation" }),
};

export default function InvestigationPage() {
  return <Workspace />;
}
