import type { Metadata, Viewport } from "next";
import { Archivo, Caveat, Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SITE_NAME, SITE_URL, shareMetadata } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const instrumentSans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"], axes: ["wdth"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

const DESCRIPTION =
  "Your sales are up. So why are you broke? An interactive business investigation platform — a BombayCoder experimental product.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MARGIN CLUB — The Business Detective",
    template: "%s · MARGIN CLUB",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  ...shareMetadata({ title: "MARGIN CLUB — The Business Detective", description: DESCRIPTION, path: "/" }),
};

export const viewport: Viewport = {
  themeColor: "#F2EBDD",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrains.variable} ${caveat.variable} antialiased`}
    >
      {/* Browser extensions (e.g. ColorZilla) inject attributes on <body>; ignore those attribute diffs only. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
