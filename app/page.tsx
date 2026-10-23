import { CaseFiles } from "@/components/landing/case-files";
import { CasePreview } from "@/components/landing/case-preview";
import { FinalCTA, SiteFooter } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { InvestigatorPreview } from "@/components/landing/investigator-preview";
import { OrderField } from "@/components/landing/order-field";
import { SiteNav } from "@/components/landing/site-nav";
import { EvidenceTicker } from "@/components/landing/ticker";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <EvidenceTicker />
        <CasePreview />
        <CaseFiles />
        <HowItWorks />
        <InvestigatorPreview />
        <OrderField />
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
