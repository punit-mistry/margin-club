/** What the curtain announces for each destination. */
export interface Destination {
  kicker: string;
  title: [string, string];
  file: string;
}

export function destinationFor(pathname: string): Destination {
  if (pathname === "/") return { kicker: "Vol. 01 · The cover", title: ["Your sales", "are up."], file: "COVER" };
  if (pathname.startsWith("/investigation")) return { kicker: "Case #001 · Opening the file", title: ["The discount", "trap."], file: "CASE-001" };
  if (pathname.startsWith("/case-study")) return { kicker: "BombayCoder · Case study", title: ["The making", "of the club."], file: "CASE-STUDY" };
  return { kicker: "Unknown file", title: ["Missing", "evidence."], file: "404" };
}
