import fs from "node:fs";
import path from "node:path";

export async function updatePackageJson(targetDir: string, projectName: string) {
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkgString = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(pkgString);

    // Update the package name
    pkg.name = projectName;
    // Reset version
    pkg.version = "0.1.0";
    // Clear out any private fields from the root if needed, but it's a monorepo
    // So usually leaving it as private: true is good for apps

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}
