import { parseMarkup } from "@/lib/ai/markup";

/** Renders engine text: [[figure]] in a blue marker, {{warning}} in signal red. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {parseMarkup(text).map((s, i) =>
        s.tone === "plain" ? (
          <span key={i}>{s.text}</span>
        ) : s.tone === "highlight" ? (
          <strong key={i} className="marker font-semibold tnum">
            {s.text}
          </strong>
        ) : (
          <strong key={i} className="marker-red font-semibold text-signal tnum">
            {s.text}
          </strong>
        ),
      )}
    </span>
  );
}
