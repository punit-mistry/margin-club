import type { Metadata } from "next";

/**
 * Absolute base for share URLs. On Vercel this is the production domain;
 * locally it falls back to the dev server.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_NAME = "MARGIN CLUB";

/**
 * Next merges `openGraph` shallowly — a page that sets it replaces the
 * layout's — so every page builds its card from this helper. Images come
 * from the nearest opengraph-image.tsx file.
 */
export function shareMetadata({ title, description, path }: { title: string; description: string; path: string }): Pick<Metadata, "openGraph" | "twitter" | "alternates"> {
  return {
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url: path,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
