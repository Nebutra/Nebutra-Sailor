import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Spawns the CLI as a child process and captures stdout/stderr
 */
export async function runCli(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const cliPath = new URL("../dist/index.js", import.meta.url).pathname;

    const child = spawn("node", [cliPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });
  });
}

export async function runCliInDir(
  args: string[],
  cwd: string,
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const cliPath = new URL("../dist/index.js", import.meta.url).pathname;

    const child = spawn("node", [cliPath, ...args], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });
  });
}

/**
 * Creates a temporary directory for test projects
 */
export async function createTempDir(): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const randomId = randomBytes(6).toString("hex");
  const dir = join(tmpdir(), `nebutra-test-${randomId}`);
  await mkdir(dir, { recursive: true });

  return {
    path: dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Mock stdin for interactive prompts
 * Note: This is a simplified version that can be extended as needed
 */
export function mockStdin(inputs: string[]): {
  write: (input: string) => void;
  end: () => void;
} {
  let inputIndex = 0;

  return {
    write: (_input: string) => {
      if (inputIndex < inputs.length) {
        inputIndex++;
      }
    },
    end: () => {
      inputIndex = 0;
    },
  };
}
