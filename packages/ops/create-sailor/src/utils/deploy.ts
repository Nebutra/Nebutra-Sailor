import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applyDeployTarget(
  targetDir: string,
  target: "vercel" | "railway" | "cloudflare" | "selfhost" | "none",
) {
  if (target === "none") return;

  const templatesDir = path.join(__dirname, "../../templates/deploy");

  if (target === "vercel") {
    await fs.promises.copyFile(
      path.join(templatesDir, "vercel.json"),
      path.join(targetDir, "vercel.json"),
    );
  } else if (target === "railway") {
    await fs.promises.copyFile(
      path.join(templatesDir, "railway.toml"),
      path.join(targetDir, "railway.toml"),
    );
  } else if (target === "cloudflare") {
    await fs.promises.copyFile(
      path.join(templatesDir, "wrangler.toml"),
      path.join(targetDir, "wrangler.toml"),
    );
  } else if (target === "selfhost") {
    await fs.promises.copyFile(
      path.join(templatesDir, "docker-compose.yml"),
      path.join(targetDir, "docker-compose.yml"),
    );
    await fs.promises.copyFile(
      path.join(templatesDir, "Dockerfile.web"),
      path.join(targetDir, "Dockerfile.web"),
    );
  }
}
