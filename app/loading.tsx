import { Logo } from "@/components/brand";

/** Route-level loading state, shown if a route suspends before it can render. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col justify-between bg-ink px-4 py-5 text-cream sm:px-8 sm:py-7" role="status" aria-label="Loading">
      <div className="flex items-center justify-between text-[18px]">
        <Logo />
        <span className="meta text-cream/60">File transfer</span>
      </div>
      <div>
        <span className="meta flex items-center gap-2 text-cream/70">
          <span className="inline-block h-2 w-2 animate-blink bg-signal" /> Opening the file
        </span>
        <p className="display mt-3 text-[19vw] leading-[0.8] sm:text-[13vw]">
          Pulling
          <br />
          <span className="text-signal">the file…</span>
        </p>
      </div>
      <div>
        <div className="h-[3px] w-full overflow-hidden bg-cream/15">
          <div className="loading-sweep h-full w-1/3 bg-signal" />
        </div>
        <p className="meta mt-2 text-cream/60">Checking the books</p>
      </div>
    </div>
  );
}
