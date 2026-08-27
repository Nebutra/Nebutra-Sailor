const fs = require("node:fs");
const path = require("node:path");

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

const ja = JSON.parse(fs.readFileSync(path.join(dir, "ja.json"), "utf8"));
const jaPaths = new Set(getLeafPaths(ja.legalPages, ""));
const extra = [...jaPaths].filter((p) => !enPaths.has(p));
console.log("Extra keys in ja:", extra);

// Show what subsections look like in ja
for (const sub of ["cookies", "privacy", "refund", "terms"]) {
  const keys = Object.keys(ja.legalPages[sub]);
  console.log(`\nja.legalPages.${sub} keys:`, keys);
}
