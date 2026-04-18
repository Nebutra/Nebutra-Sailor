import fs from "node:fs";
import path from "node:path";

/**
 * Payment provider selection applier for create-sailor.
 *
 * Maps the `--payment` CLI flag to concrete filesystem mutations in
 * `packages/billing`:
 *  - `stripe`  → keep stripe provider dir, drop lemonsqueezy/chinapay/polar
 *  - `lemon`   → keep lemonsqueezy, drop stripe/chinapay/polar
 *  - `wechat`  → keep chinapay, drop others
 *  - `alipay`  → keep chinapay, drop others
 *  - `none`    → delete the entire `packages/billing` directory
 *
 * Also narrows the `CheckoutProviderType` union in `src/checkout/types.ts`
 * (if present) down to the selected provider.
 */

export type PaymentChoice = "stripe" | "lemon" | "wechat" | "alipay" | "none";

const ALL_PROVIDER_DIRS = ["stripe", "lemonsqueezy", "chinapay", "polar"] as const;

function safeRm(target: string): void {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function keptProviderDirs(choice: Exclude<PaymentChoice, "none">): string[] {
  switch (choice) {
    case "stripe":
      return ["stripe"];
    case "lemon":
      return ["lemonsqueezy"];
    case "wechat":
    case "alipay":
      return ["chinapay"];
  }
}

function appendEnv(targetDir: string, content: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.appendFileSync(envExamplePath, "\n" + content);
  } else {
    fs.writeFileSync(envExamplePath, content);
  }
}

function envForChoice(choice: Exclude<PaymentChoice, "none">): string {
  switch (choice) {
    case "stripe":
      return "# Stripe\nSTRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\n";
    case "lemon":
      return "# Lemon Squeezy\nLEMONSQUEEZY_API_KEY=\nLEMONSQUEEZY_STORE_ID=\nLEMONSQUEEZY_WEBHOOK_SECRET=\n";
    case "wechat":
      return "# WeChat Pay (via ChinaPay aggregator)\nCHINAPAY_APP_ID=\nCHINAPAY_APP_SECRET=\nCHINAPAY_WECHAT_ENABLED=true\n";
    case "alipay":
      return "# Alipay (via ChinaPay aggregator)\nCHINAPAY_APP_ID=\nCHINAPAY_APP_SECRET=\nCHINAPAY_ALIPAY_ENABLED=true\n";
  }
}

export async function applyPaymentSelection(
  targetDir: string,
  payment: PaymentChoice,
): Promise<void> {
  const billingPkgDir = path.join(targetDir, "packages", "billing");
  if (!fs.existsSync(billingPkgDir)) return;

  if (payment === "none") {
    safeRm(billingPkgDir);
    return;
  }

  const srcDir = path.join(billingPkgDir, "src");
  const keep = new Set(keptProviderDirs(payment));

  for (const dir of ALL_PROVIDER_DIRS) {
    if (!keep.has(dir)) {
      safeRm(path.join(srcDir, dir));
    }
  }

  // Narrow the checkout provider union if present.
  const checkoutTypes = path.join(srcDir, "checkout", "types.ts");
  if (fs.existsSync(checkoutTypes)) {
    const narrowed =
      payment === "stripe" ? "stripe" : payment === "lemon" ? "lemonsqueezy" : "chinapay";
    const content = fs.readFileSync(checkoutTypes, "utf8");
    const next = content.replace(
      /export type CheckoutProviderType\s*=\s*[^;]+;/,
      `export type CheckoutProviderType = "${narrowed}";`,
    );
    if (next !== content) {
      fs.writeFileSync(checkoutTypes, next);
    }
  }

  appendEnv(targetDir, envForChoice(payment));
}
