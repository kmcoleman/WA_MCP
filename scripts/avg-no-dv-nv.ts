import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "campouts-geocoded.json"), "utf-8"));

interface Row {
  date: string; eventName: string; cancelled: boolean;
  campoutDistMi: number | null; campoutDurMin: number | null;
  campoutGeo: { displayName: string } | null;
}

const DV_KEYWORDS = ["death valley", "furnace creek"];
function isExcluded(r: Row): boolean {
  const name = ((r.campoutGeo?.displayName || "") + " " + (r.eventName || "")).toLowerCase();
  return DV_KEYWORDS.some(k => name.includes(k));
}

function fmt(mins: number | null): string {
  if (mins == null) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + "h" + (m > 0 ? String(m).padStart(2, "0") + "m" : "");
}

const avg = (a: number[]) => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;

const byYear = new Map<number, Row[]>();
for (const r of data as Row[]) {
  const y = parseInt(r.date.substring(0, 4));
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y)!.push(r);
}

console.log("Year   Held  Excl  Kept │  Avg Mi  Avg Time");
console.log("─".repeat(50));

const allDists: number[] = [];
const allDurs: number[] = [];

for (const year of [...byYear.keys()].sort()) {
  const rows = byYear.get(year)!;
  const held = rows.filter(r => !r.cancelled);
  const excluded = held.filter(r => isExcluded(r));
  const kept = held.filter(r => !isExcluded(r) && r.campoutDistMi != null);
  const dists = kept.map(r => r.campoutDistMi!);
  const durs = kept.filter(r => r.campoutDurMin != null).map(r => r.campoutDurMin!);
  allDists.push(...dists);
  allDurs.push(...durs);
  console.log(
    String(year).padEnd(7) +
    String(held.length).padStart(4) +
    String(excluded.length).padStart(6) +
    String(kept.length).padStart(6) +
    " │ " +
    (avg(dists) != null ? avg(dists) + " mi" : "-").padStart(7) +
    "  " + fmt(avg(durs))
  );
}

console.log("─".repeat(50));
console.log(
  "ALL".padEnd(7) +
  "".padStart(4) +
  "".padStart(6) +
  String(allDists.length).padStart(6) +
  " │ " +
  (avg(allDists) + " mi").padStart(7) +
  "  " + fmt(avg(allDurs))
);
