import { defineIcp } from "../src/index";

process.stdout.write(
  `${JSON.stringify(
    defineIcp("decision makers at mid-size D2C e-commerce companies in the US"),
    null,
    2,
  )}\n`,
);
