const fs = require("fs");
const path = require("path");

function getLeafPaths(obj, prefix) {
  const paths = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + "." + k : k;
    if (typeof v === "object" && v !== null) {
      paths.push(...getLeafPaths(v, p));
    } else {
      paths.push(p);
    }
  }
  return paths;
}

const dir = path.join(__dirname, "../apps/landing/messages");
const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));
const enPaths = new Set(getLeafPaths(en.legalPages, ""));

for (const loc of ["ja", "ko", "es", "fr", "de"]) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, loc + ".json"), "utf8"));
  const locPaths = new Set(getLeafPaths(d.legalPages, ""));
  const missing = [...enPaths].filter((p) => !locPaths.has(p));
  const extra = [...locPaths].filter((p) => !enPaths.has(p));
  console.log(`\n=== ${loc} ===`);
  console.log(`Missing: ${missing.length}`);
  if (missing.length > 0 && missing.length <= 10) console.log(missing);
  if (missing.length > 10) {
    // Show by subsection
    const bySub = {};
    for (const m of missing) {
      const sub = m.split(".")[0];
      bySub[sub] = (bySub[sub] || 0) + 1;
    }
    console.log("  By subsection:", bySub);
  }
  if (extra.length > 0) console.log(`Extra: ${extra.length}`);
}
