import { HandUnderline } from "@/components/brand";
import { caseHeadline } from "@/features/analytics/series";
import { num } from "@/lib/analytics/format";

export function HowItWorks() {
  const head = caseHeadline();
  const steps = [
    {
      n: "01",
      title: "Open the books",
      body: `Every order, product cost, fee and coupon in the case file loads into your browser — ${num(head.orders)} orders, ${num(head.customers)} customers. Nothing is uploaded anywhere.`,
      log: `> load case_001 … ${num(head.orders)} rows ok`,
    },
    {
      n: "02",
      title: "Read the exhibits",
      body: "Revenue against profit. Every order against its discount. Every product against its margin. Click any point to pull the record behind it.",
      log: "> plot exhibit A–E … ok",
    },
    {
      n: "03",
      title: "Question the investigator",
      body: "Ask in plain English. The local analysis engine picks the metrics, runs the arithmetic and shows its working, step by step — with receipts.",
      log: "> why is profit declining? … showing working",
    },
    {
      n: "04",
      title: "Close the case",
      body: `Export the evidence as CSV, take the three actions the numbers point to, and keep your investigation history for next month.`,
      log: `> export evidence.csv … ${num(head.flagged)} flagged`,
    },
  ];
  return (
    <section id="how" className="scroll-mt-14 border-b border-ink">
      <div className="flex items-center justify-between border-b border-ink px-4 py-3 sm:px-8">
        <span className="meta">03 — Procedure</span>
        <span className="meta text-ink-soft">How the investigation works</span>
      </div>
      <div className="grid gap-10 px-4 pt-10 pb-16 sm:px-8 lg:grid-cols-12">
        <h2 className="display text-[17vw] lg:col-span-4 lg:text-[8.6vw]">
          Four
          <br />
          moves
          <br />
          <span className="relative inline-block">
            <span className="serif-italic text-[0.62em] text-signal">to the truth</span>
            <HandUnderline className="absolute -bottom-1 left-0 h-3 w-full text-signal" draw={false} />
          </span>
        </h2>
        <ol className="grid gap-0 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4 lg:[--stagger:56px]">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="group relative border-t border-ink pt-4 pb-8 sm:border-l sm:pl-4 lg:pt-5"
              style={{ marginTop: `calc(var(--stagger, 0px) * ${i})` }}
            >
              <span
                className="display block text-[120px] leading-[0.75] text-transparent transition-colors duration-300 [-webkit-text-stroke:1.5px_#161616] group-hover:text-signal group-hover:[-webkit-text-stroke:1.5px_#E74732]"
              >
                {s.n}
              </span>
              <h3 className="display mt-5 text-[34px] leading-[0.9]">{s.title}</h3>
              <p className="mt-3 max-w-[34ch] text-[15px] leading-snug text-ink-soft">{s.body}</p>
              <p className="mt-5 font-mono text-[11px] text-electric">{s.log}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
