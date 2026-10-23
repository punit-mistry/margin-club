import { ImageResponse } from "next/og";
import { OG_SIZE, ShareCard } from "@/components/og/share-card";

export const alt = "MARGIN CLUB — Your sales are up. So why are you broke? Revenue +48%, profit −32% in Case #001.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<ShareCard variant="home" />, size);
}
