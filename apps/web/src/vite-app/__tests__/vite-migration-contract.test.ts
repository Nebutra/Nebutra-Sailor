import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(__dirname, "../../..");

function readAppFile(relativePath: string) {
  return readFileSync(path.join(appRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readAppFile(relativePath)) as T;
}

describe("apps/web Vite migration contract", () => {
  it("uses Vite and TanStack Router/Query as the Product App runtime", () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>("package.json");

    expect(packageJson.scripts.dev).toBe("vite --host 0.0.0.0 --port 3001");
    expect(packageJson.scripts.build).toContain("vite build");
    expect(packageJson.scripts.build).not.toContain("next build");
    expect(packageJson.scripts.typecheck).toBe("tsc --noEmit --pretty false");

    expect(packageJson.dependencies["@tanstack/react-router"]).toBe("1.170.13");
    expect(packageJson.dependencies["@tanstack/react-query"]).toBe("5.101.0");
    expect(packageJson.dependencies["@tanstack/react-query-devtools"]).toBe("5.101.0");
    expect(packageJson.devDependencies["@tailwindcss/vite"]).toBe("4.3.0");
    expect(packageJson.devDependencies.vite).toBe("catalog:");
    expect(packageJson.devDependencies["@vitejs/plugin-react"]).toBe("6.0.2");
    expect(packageJson.devDependencies["@tanstack/router-plugin"]).toBe("1.168.16");
  });

  it("has a Vite browser entry that does not import Next.js runtime APIs", () => {
    const requiredFiles = [
      "index.html",
      "vite.config.ts",
      "src/main.tsx",
      "src/vite-app/router.tsx",
      "src/vite-app/routes/__root.tsx",
      "src/vite-app/routes/startup-os.tsx",
      "src/vite-app/routes/sign-in.tsx",
      "src/vite-app/routes/settings.tsx",
      "src/vite-app/legacy-next-boundary-inventory.ts",
    ];

    for (const file of requiredFiles) {
      expect(existsSync(path.join(appRoot, file)), `${file} should exist`).toBe(true);
    }

    const browserEntry = [
      readAppFile("src/main.tsx"),
      readAppFile("src/vite-app/router.tsx"),
      readAppFile("src/vite-app/routes/__root.tsx"),
      readAppFile("src/vite-app/routes/startup-os.tsx"),
      readAppFile("src/vite-app/routes/sign-in.tsx"),
      readAppFile("src/vite-app/routes/settings.tsx"),
    ].join("\n");

    expect(browserEntry).toContain("@tanstack/react-router");
    expect(browserEntry).toContain("@tanstack/react-query");
    expect(browserEntry).not.toMatch(/from ["']next\//);
    expect(browserEntry).not.toContain("server-only");
    expect(browserEntry).not.toContain("@clerk/nextjs/server");
    expect(browserEntry).not.toContain("@nebutra/db");
  });

  it("keeps browser API access on the gateway client and Vite public env", () => {
    const browserClient = readAppFile("src/lib/api/browser-client.ts");

    expect(browserClient).toContain("VITE_API_GATEWAY_URL");
    expect(browserClient).toContain("NEXT_PUBLIC_API_GATEWAY_URL");
    expect(browserClient).toContain("resolveApiBaseUrlFromEnv");
    expect(browserClient).toContain("openapi-fetch");
  });

  it("records the legacy Next server-side surfaces that are not in the Vite bundle", async () => {
    const inventoryPath = path.join(appRoot, "src/vite-app/legacy-next-boundary-inventory.ts");
    const inventorySource = readFileSync(inventoryPath, "utf8");

    expect(inventorySource).toContain("apiRouteHandlers");
    expect(inventorySource).toContain(
      "Startup OS projects/detail/files/canvas/context/review/revert/chat/run execute under backends/gateway/src/routes/startup-os",
    );
    expect(inventorySource).toContain("/api/uploads/[...key]");
    expect(inventorySource).toContain("serverActions");
    expect(inventorySource).toContain("settings/notifications/actions");
    expect(inventorySource).toContain("authServerHelpers");
    expect(inventorySource).toContain("src/lib/auth.ts");
  });
});
