import type { Metadata } from "next";
import { Workspace } from "@/features/investigation/workspace";

export const metadata: Metadata = {
  title: "Case #001 — The Discount Trap",
  description: "Investigation workspace: evidence canvas, selected evidence and the local analysis engine.",
};

export default function InvestigationPage() {
  return <Workspace />;
}
