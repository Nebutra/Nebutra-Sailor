#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    outputDir: "",
    beforePrefix: "",
    afterPrefix: "",
    runs: 3,
    targetPath: "/tenants",
    containerImage: "",
    port: 3101,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    switch (key) {
      case "--output-dir":
        args.outputDir = value;
        i += 1;
        break;
      case "--before-prefix":
        args.beforePrefix = value;
        i += 1;
        break;
      case "--after-prefix":
        args.afterPrefix = value;
        i += 1;
        break;
      case "--runs":
        args.runs = Number(value);
        i += 1;
        break;
      case "--target-path":
        args.targetPath = value;
        i += 1;
        break;
      case "--container-image":
        args.containerImage = value;
        i += 1;
        break;
      case "--port":
        args.port = Number(value);
        i += 1;
        break;
      default:
        break;
    }
  }

  if (!args.outputDir || !args.beforePrefix || !args.afterPrefix || !Number.isFinite(args.runs)) {
    throw new Error("Missing required args: --output-dir --before-prefix --after-prefix --runs");
  }

  return args;
}

function toScore(value) {
  return Math.round((value ?? 0) * 100);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(3);
}

function formatDelta(afterValue, beforeValue) {
  if (!Number.isFinite(afterValue) || !Number.isFinite(beforeValue)) return "n/a";
  const delta = afterValue - beforeValue;
  return `${delta > 0 ? "+" : ""}${formatNumber(delta)}`;
}

function quantile(values, q) {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function median(values) {
  return quantile(values, 0.5);
}

function p90(values) {
  return quantile(values, 0.9);
}

function readRuns(outputDir, prefix, runs) {
  const runData = [];
  for (let i = 1; i <= runs; i += 1) {
    let filename = `${prefix}.r${i}.json`;
    let filePath = path.join(outputDir, filename);

    // Backward-compatible fallback for old single-run naming: <prefix>.json
    if (!fs.existsSync(filePath) && i === 1) {
      const legacyFilename = `${prefix}.json`;
      const legacyPath = path.join(outputDir, legacyFilename);
      if (fs.existsSync(legacyPath)) {
        filename = legacyFilename;
        filePath = legacyPath;
      }
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing Lighthouse output: ${filePath}`);
    }

    runData.push({
      filename,
      payload: JSON.parse(fs.readFileSync(filePath, "utf8")),
    });
  }
  return runData;
}

function listNumbers(values) {
  if (values.length === 0) return "n/a";
  return values.map((v) => formatNumber(v)).join(", ");
}

function makeCategoryRow(name, beforeRuns, afterRuns) {
  const beforeValues = beforeRuns.map((run) => toScore(run.payload.categories[name]?.score));
  const afterValues = afterRuns.map((run) => toScore(run.payload.categories[name]?.score));

  return {
    name,
    beforeValues,
    afterValues,
    beforeMedian: median(beforeValues),
    afterMedian: median(afterValues),
    beforeP90: p90(beforeValues),
    afterP90: p90(afterValues),
  };
}

function makeMetricRow(id, label, beforeRuns, afterRuns) {
  const beforeValues = beforeRuns
    .map((run) => Number(run.payload.audits[id]?.numericValue))
    .filter(Number.isFinite);
  const afterValues = afterRuns
    .map((run) => Number(run.payload.audits[id]?.numericValue))
    .filter(Number.isFinite);

  return {
    id,
    label,
    beforeValues,
    afterValues,
    beforeMedian: median(beforeValues),
    afterMedian: median(afterValues),
    beforeP90: p90(beforeValues),
    afterP90: p90(afterValues),
  };
}

function buildMarkdown({
  outputDir,
  runs,
  targetPath,
  containerImage,
  port,
  categoryRows,
  metricRows,
  beforeRuns,
  afterRuns,
}) {
  let md = "";
  md += "# Lighthouse CI Comparison (Mobile)\n\n";
  md += `- Target: \`http://127.0.0.1:${port}${targetPath}\`\n`;
  md += `- Container: \`${containerImage}\`\n`;
  md += `- Runs per snapshot: ${runs}\n`;
  md += "- Throttling: mobile simulate (CPUx4, RTT 150ms, down 1638.4 Kbps, up 675 Kbps)\n\n";

  md += "## Category Scores\n\n";
  md +=
    "| Category | Before Median | After Median | Delta | Before p90 | After p90 | Before Runs | After Runs |\n";
  md += "|---|---:|---:|---:|---:|---:|---|---|\n";
  for (const row of categoryRows) {
    md += `| ${row.name} | ${formatNumber(row.beforeMedian)} | ${formatNumber(row.afterMedian)} | ${formatDelta(row.afterMedian, row.beforeMedian)} | ${formatNumber(row.beforeP90)} | ${formatNumber(row.afterP90)} | ${listNumbers(row.beforeValues)} | ${listNumbers(row.afterValues)} |\n`;
  }

  md += "\n## Core Metrics\n\n";
  md +=
    "| Metric | Before Median | After Median | Delta (After-Before) | Before p90 | After p90 | Before Runs | After Runs |\n";
  md += "|---|---:|---:|---:|---:|---:|---|---|\n";
  for (const row of metricRows) {
    md += `| ${row.label} | ${formatNumber(row.beforeMedian)} | ${formatNumber(row.afterMedian)} | ${formatDelta(row.afterMedian, row.beforeMedian)} | ${formatNumber(row.beforeP90)} | ${formatNumber(row.afterP90)} | ${listNumbers(row.beforeValues)} | ${listNumbers(row.afterValues)} |\n`;
  }

  md += "\n## Raw JSON\n\n";
  for (const run of beforeRuns) {
    md += `- [${run.filename}](${path.join(outputDir, run.filename)})\n`;
  }
  for (const run of afterRuns) {
    md += `- [${run.filename}](${path.join(outputDir, run.filename)})\n`;
  }

  return md;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(args.outputDir);

  const beforeRuns = readRuns(outputDir, args.beforePrefix, args.runs);
  const afterRuns = readRuns(outputDir, args.afterPrefix, args.runs);

  const categoryIds = ["performance", "accessibility", "best-practices", "seo"];
  const metricDefs = [
    ["first-contentful-paint", "FCP (ms)"],
    ["largest-contentful-paint", "LCP (ms)"],
    ["speed-index", "Speed Index (ms)"],
    ["total-blocking-time", "TBT (ms)"],
    ["interactive", "TTI (ms)"],
    ["cumulative-layout-shift", "CLS"],
    ["interaction-to-next-paint", "INP (ms)"],
  ];

  const categoryRows = categoryIds.map((id) => makeCategoryRow(id, beforeRuns, afterRuns));
  const metricRows = metricDefs.map(([id, label]) =>
    makeMetricRow(id, label, beforeRuns, afterRuns),
  );

  const markdown = buildMarkdown({
    outputDir,
    runs: args.runs,
    targetPath: args.targetPath,
    containerImage: args.containerImage,
    port: args.port,
    categoryRows,
    metricRows,
    beforeRuns,
    afterRuns,
  });

  const markdownPath = path.join(outputDir, "dashboard-tenants-compare.md");
  fs.writeFileSync(markdownPath, markdown);

  const summary = {
    generatedAt: new Date().toISOString(),
    runs: args.runs,
    target: `http://127.0.0.1:${args.port}${args.targetPath}`,
    categories: categoryRows,
    metrics: metricRows,
  };
  fs.writeFileSync(
    path.join(outputDir, "dashboard-tenants-compare.summary.json"),
    JSON.stringify(summary, null, 2),
  );

  process.stdout.write(`${markdown}\n`);
}

main();
