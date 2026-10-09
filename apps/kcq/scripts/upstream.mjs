/** Check a candidate in an isolated checkout; never mutate a developer's KCQ repository. */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function validatePin(pin) {
  for (const repository of [
    pin.repository,
    ...(pin.upstreamRepository ? [pin.upstreamRepository] : []),
  ]) {
    if (
      !/^https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9][A-Za-z0-9_.-]*\.git$/.test(repository)
    )
      throw new Error("Expected a credential-free GitHub HTTPS repository.");
  }
  if (!/^[a-f0-9]{40}$/.test(pin.commit)) throw new Error("Expected immutable KCQ SHA.");
  return pin;
}
export function validateRef(ref) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(ref) || ref.includes(".."))
    throw new Error("Expected a branch, tag or commit ref.");
  return ref;
}
export async function updatePin(path, candidate, verify, apply) {
  validatePin(candidate);
  const previous = readFileSync(path, "utf8");
  await verify();
  if (!apply) return;
  if (readFileSync(path, "utf8") !== previous)
    throw new Error("Production pin changed during validation.");
  writeFileSync(path, `${JSON.stringify(candidate, null, 2)}\n`);
}
function run(command, args, cwd, env = process.env, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Candidate check failed: ${command}`);
  return result.stdout?.trim();
}
async function main() {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const path = resolve(root, "apps/kcq/chart-source.json");
  const snapshot = readFileSync(path, "utf8");
  const pin = validatePin(JSON.parse(snapshot));
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const index = args.indexOf("--ref");
  const ref = validateRef(index < 0 ? process.env.KCQ_CANDIDATE_REF || "main" : args[index + 1]);
  const allowed =
    index < 0
      ? args.filter((arg) => arg !== "--apply")
      : args.filter((_, i) => i !== index && i !== index + 1).filter((arg) => arg !== "--apply");
  if (allowed.length) throw new Error("Usage: upstream.mjs [--ref branch|tag|SHA] [--apply]");
  const cache = resolve(root, ".nebutra/kcq-candidates");
  mkdirSync(cache, { recursive: true });
  const source = mkdtempSync(resolve(cache, "candidate-"));
  run("git", ["init", source], root);
  const repository = pin.upstreamRepository || pin.repository;
  run("git", ["remote", "add", "origin", repository], source);
  run("git", ["fetch", "--depth=1", "origin", ref], source);
  run("git", ["checkout", "--detach", "FETCH_HEAD"], source);
  const candidate = validatePin({
    ...pin,
    repository,
    commit: run("git", ["rev-parse", "HEAD"], source, process.env, true),
  });
  console.info(`Checking KCQ ${ref} at ${candidate.commit}; production pin ${pin.commit}`);
  if (readFileSync(path, "utf8") !== snapshot)
    throw new Error("Production pin changed during fetch.");
  await updatePin(
    path,
    candidate,
    () =>
      run(process.execPath, ["apps/kcq/scripts/verify.mjs"], root, {
        ...process.env,
        KCQ_SOURCE_DIR: source,
      }),
    apply,
  );
  console.info(
    apply
      ? "Candidate passed; pin updated. Review and commit the change before release."
      : "Candidate passed; production pin unchanged. Use --apply to prepare an upgrade.",
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
