import fs from "node:fs";
import path from "node:path";

export async function applyMeteringSwitch(
  targetDir: string,
  mode: "auto" | "on" | "off" | string,
  payment: "stripe" | "lemonsqueezy" | "none" | string,
): Promise<void> {
  const meteringPkg = path.join(targetDir, "packages", "metering");

  // Resolve "auto"
  let effective: "on" | "off";
  if (mode === "auto") {
    effective = payment !== "none" ? "on" : "off";
  } else if (mode === "on" || mode === "off") {
    effective = mode;
  } else {
    effective = "off";
  }

  if (effective === "off") {
    if (fs.existsSync(meteringPkg)) {
      fs.rmSync(meteringPkg, { recursive: true, force: true });
    }
    return;
  }

  // "on" — keep package, append env vars
  const envPath = path.join(targetDir, ".env.example");
  if (!fs.existsSync(envPath)) return;

  const existing = fs.readFileSync(envPath, "utf-8");
  const marker = "# Metering (usage-based billing)";
  if (!existing.includes(marker)) {
    const block = [
      "",
      "# =============================================",
      marker,
      "# Docs: see packages/metering/README.md",
      "# =============================================",
      "# ClickHouse-based metering pipeline for consumption billing.",
      'CLICKHOUSE_URL=""',
      'CLICKHOUSE_USER="default"',
      'CLICKHOUSE_PASSWORD=""',
      'CLICKHOUSE_DATABASE="metering"',
      "",
    ].join("\n");
    fs.appendFileSync(envPath, block);
  }
}
