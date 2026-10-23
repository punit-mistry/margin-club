import { ImageResponse } from "next/og";
import { OG_SIZE, ShareCard } from "@/components/og/share-card";

export const alt = "MARGIN CLUB case study — designing a business detective. A BombayCoder concept product.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<ShareCard variant="case-study" />, size);
}
