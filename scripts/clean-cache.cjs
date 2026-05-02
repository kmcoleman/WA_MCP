const fs = require("fs");
const gc = JSON.parse(fs.readFileSync("scripts/geocode-cache.json", "utf-8"));
const c = {};
for (const k of Object.keys(gc)) {
  if (gc[k] !== "NOT_FOUND") c[k] = gc[k];
}
fs.writeFileSync("scripts/geocode-cache.json", JSON.stringify(c, null, 2));

const rc = JSON.parse(fs.readFileSync("scripts/route-cache.json", "utf-8"));
const r = {};
for (const k of Object.keys(rc)) {
  if (rc[k] !== "NO_ROUTE") r[k] = rc[k];
}
fs.writeFileSync("scripts/route-cache.json", JSON.stringify(r, null, 2));
console.log("Caches cleaned");
