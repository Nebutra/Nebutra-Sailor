const fs = require("fs");
const path = require("path");

function countKeys(obj) {
  let c = 0;
  for (const v of Object.values(obj)) {
    if (typeof v === "object" && v !== null) c += countKeys(v);
    else c++;
  }
  return c;
}

const dir = path.join(__dirname, "../apps/landing-page/messages");
const locales = ["en", "zh", "ja", "ko", "es", "fr", "de"];

for (const loc of locales) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, loc + ".json"), "utf8"));
  const lp = d.legalPages;
  if (lp) {
    console.log(
      loc + ": " + countKeys(lp) + " leaf keys, subsections: " + Object.keys(lp).join(", "),
    );
  } else {
    console.log(loc + ": NO legalPages");
  }
}
