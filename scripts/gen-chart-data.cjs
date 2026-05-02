const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "campouts-geocoded.json"), "utf-8"));

const lines = ["Date,Event,Location,Miles,Hours"];

for (const r of data) {
  if (r.cancelled) continue;
  if (r.campoutDistMi == null || r.campoutDurMin == null) continue;
  const loc = (r.campoutGeo && r.campoutGeo.displayName || "").replace(/,/g, " ");
  const name = r.eventName.replace(/,/g, " ");
  const hours = (r.campoutDurMin / 60).toFixed(1);
  lines.push(`${r.date},"${name}","${loc}",${r.campoutDistMi},${hours}`);
}

const outPath = path.join(__dirname, "chart-data.csv");
fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log("Written:", outPath);
console.log(lines.length - 1 + " events");
