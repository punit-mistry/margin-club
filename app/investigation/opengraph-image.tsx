import { ImageResponse } from "next/og";
import { OG_SIZE, ShareCard } from "@/components/og/share-card";

export const alt = "MARGIN CLUB — Case #001 is open: the Discount Trap investigation workspace.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<ShareCard variant="investigation" />, size);
}
