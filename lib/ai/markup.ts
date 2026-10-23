/** Splits engine text into segments: [[x]] → highlight, {{x}} → red warning. */
export type Segment = { text: string; tone: "plain" | "highlight" | "warning" };

export function parseMarkup(input: string): Segment[] {
  const out: Segment[] = [];
  const re = /\[\[(.+?)\]\]|\{\{(.+?)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) out.push({ text: input.slice(last, m.index), tone: "plain" });
    out.push(m[1] !== undefined ? { text: m[1], tone: "highlight" } : { text: m[2], tone: "warning" });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last), tone: "plain" });
  return out;
}

export function stripMarkup(input: string): string {
  return input.replace(/\[\[(.+?)\]\]/g, "$1").replace(/\{\{(.+?)\}\}/g, "$1");
}
