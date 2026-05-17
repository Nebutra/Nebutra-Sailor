import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityError } from "@nebutra/errors";

export type BrowserStrategy = "explore" | "deterministic" | "replay";

export interface BrowserAction {
  readonly type: "navigate" | "act" | "extract" | "observe";
  readonly instruction?: string;
  readonly url?: string;
  readonly selector?: string;
  readonly value?: unknown;
  readonly screenshotPath?: string;
  readonly at?: string;
}

export interface BrowserRecording {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly strategy: BrowserStrategy;
  readonly createdAt: string;
  readonly startUrl?: string;
  readonly actions: readonly BrowserAction[];
}

export interface BrowserTask {
  readonly tenantId?: string;
  readonly taskId?: string;
  readonly objective: string;
  readonly startUrl?: string;
  readonly outputSchema?: Record<string, string>;
  readonly budgetSeconds?: number;
  readonly prefer?: "explore" | "replay" | "deterministic";
}

export interface BrowserTaskResult {
  readonly sessionId: string;
  readonly strategy: BrowserStrategy;
  readonly output: unknown;
  readonly actions: readonly BrowserAction[];
}

export interface BrowserHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface BrowserExplorer {
  runTask(task: RequiredTenant<BrowserTask>): Promise<BrowserTaskResult>;
  doctor(): Promise<BrowserHealth>;
}

export interface BrowserSession {
  readonly id: string;
  readonly tenantId: string;
  readonly currentUrl?: string;
  act(instruction: string): Promise<BrowserAction>;
  extract<T = unknown>(instruction?: string): Promise<T>;
  observe(): Promise<readonly BrowserAction[]>;
  close(): Promise<void>;
}

export interface DeterministicBrowserDriver {
  open?(url: string, options: { tenantId: string; sessionId?: string }): Promise<BrowserSession>;
  replay(recording: BrowserRecording): Promise<BrowserTaskResult>;
  doctor(): Promise<BrowserHealth>;
}

export interface BrowserRecorder {
  save(recording: BrowserRecording): Promise<void>;
  load(tenantId: string, sessionId: string): Promise<BrowserRecording | null>;
}

export interface BrowserControlOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly recorder?: BrowserRecorder;
  readonly explorer?: BrowserExplorer;
  readonly deterministic?: DeterministicBrowserDriver;
}

type RequiredTenant<T extends { readonly tenantId?: string }> = Omit<T, "tenantId"> & {
  readonly tenantId: string;
};

function debugPath(root = process.cwd()): string {
  return join(root, ".nebutra", "debug", "browser-control.jsonl");
}

async function appendDebug(root: string, entry: Record<string, unknown>): Promise<void> {
  const path = debugPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readBrowserDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  try {
    const raw = await readFile(debugPath(root), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}

function requireTenant(explicit: string | undefined, fallback: string | undefined): string {
  const tenantId = explicit ?? fallback;
  if (!tenantId) {
    throw new CapabilityError("browser-control", "Browser execution requires tenant context", {
      suggestion:
        "Pass tenantId on the request or construct BrowserControl with a tenantId default.",
      statusCode: 400,
    });
  }
  return tenantId;
}

function sessionIdFrom(task: BrowserTask): string {
  const base = task.taskId ?? task.objective;
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${clean || "browser_session"}_${Date.now().toString(36)}`;
}

export class JsonBrowserRecorder implements BrowserRecorder {
  readonly #root: string;

  constructor(root = process.cwd()) {
    this.#root = root;
  }

  async save(recording: BrowserRecording): Promise<void> {
    const path = this.#recordingPath(recording.tenantId, recording.sessionId);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(recording, null, 2)}\n`, "utf8");
  }

  async load(tenantId: string, sessionId: string): Promise<BrowserRecording | null> {
    try {
      return JSON.parse(await readFile(this.#recordingPath(tenantId, sessionId), "utf8"));
    } catch {
      return null;
    }
  }

  #recordingPath(tenantId: string, sessionId: string): string {
    return join(this.#root, ".nebutra", "browser-control", tenantId, `${sessionId}.json`);
  }
}

export class HttpBrowserSession implements BrowserSession {
  readonly id: string;
  readonly tenantId: string;
  readonly currentUrl: string;
  readonly #html: string;

  private constructor(id: string, tenantId: string, currentUrl: string, html: string) {
    this.id = id;
    this.tenantId = tenantId;
    this.currentUrl = currentUrl;
    this.#html = html;
  }

  static async open(
    url: string,
    options: { tenantId: string; sessionId?: string; fetch?: typeof fetch } = { tenantId: "local" },
  ): Promise<HttpBrowserSession> {
    const fetchImpl = options.fetch ?? fetch;
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new CapabilityError("browser-control", `HTTP browser could not open ${url}`, {
        suggestion:
          "Check that the URL is reachable, or configure the interactive browser sidecar for authenticated pages.",
        statusCode: response.status,
      });
    }
    return new HttpBrowserSession(
      options.sessionId ?? `http_${Date.now().toString(36)}`,
      options.tenantId,
      url,
      await response.text(),
    );
  }

  async act(instruction: string): Promise<BrowserAction> {
    return {
      type: "act",
      instruction,
      value: {
        skipped: true,
        reason:
          "HTTP session is read-only; configure the deterministic browser sidecar for DOM actions.",
      },
    };
  }

  async extract<T = unknown>(instruction = "extract visible text"): Promise<T> {
    return {
      instruction,
      text: htmlToText(this.#html),
      links: extractLinks(this.#html, this.currentUrl),
    } as T;
  }

  async observe(): Promise<readonly BrowserAction[]> {
    return [
      {
        type: "observe",
        url: this.currentUrl,
        value: { links: extractLinks(this.#html, this.currentUrl).slice(0, 20) },
      },
    ];
  }

  async close(): Promise<void> {
    return undefined;
  }
}

export class DeterministicHttpDriver implements DeterministicBrowserDriver {
  readonly #fetch: typeof fetch | undefined;

  constructor(options: { fetch?: typeof fetch } = {}) {
    this.#fetch = options.fetch;
  }

  async open(
    url: string,
    options: { tenantId: string; sessionId?: string },
  ): Promise<BrowserSession> {
    return HttpBrowserSession.open(url, {
      ...options,
      ...(this.#fetch ? { fetch: this.#fetch } : {}),
    });
  }

  async replay(recording: BrowserRecording): Promise<BrowserTaskResult> {
    return {
      sessionId: recording.sessionId,
      strategy: "replay",
      output: { replayedActions: recording.actions.length },
      actions: recording.actions,
    };
  }

  async doctor(): Promise<BrowserHealth> {
    return {
      provider: "deterministic_http",
      ok: true,
      suggestion:
        "Use the browser sidecar for mutating DOM actions; HTTP mode is only for deterministic public-page observation.",
    };
  }
}

export class BrowserControl {
  readonly #tenantId: string | undefined;
  readonly #root: string;
  readonly #recorder: BrowserRecorder;
  readonly #explorer: BrowserExplorer | undefined;
  readonly #deterministic: DeterministicBrowserDriver;

  constructor(options: BrowserControlOptions = {}) {
    this.#tenantId = options.tenantId;
    this.#root = options.root ?? process.cwd();
    this.#recorder = options.recorder ?? new JsonBrowserRecorder(this.#root);
    this.#explorer = options.explorer;
    this.#deterministic = options.deterministic ?? new DeterministicHttpDriver();
  }

  static local(options: BrowserControlOptions = {}): BrowserControl {
    return new BrowserControl(options);
  }

  async task(task: BrowserTask): Promise<BrowserTaskResult> {
    const tenantId = requireTenant(task.tenantId, this.#tenantId);
    const requiredTask: RequiredTenant<BrowserTask> = { ...task, tenantId };

    if (task.prefer === "deterministic" && task.startUrl) {
      return this.#runDeterministic(requiredTask);
    }

    if (this.#explorer) {
      const result = await this.#explorer.runTask(requiredTask);
      await this.#saveRecording(requiredTask, result);
      return result;
    }

    if (task.startUrl) {
      return this.#runDeterministic(requiredTask);
    }

    throw new CapabilityError("browser-control", "No browser executor can handle this task", {
      suggestion:
        "Provide a startUrl for deterministic HTTP observation or configure the first-run browser executor.",
      statusCode: 503,
    });
  }

  async open(
    url: string,
    options: { tenantId?: string; sessionId?: string } = {},
  ): Promise<BrowserSession> {
    const tenantId = requireTenant(options.tenantId, this.#tenantId);
    if (!this.#deterministic.open) {
      throw new CapabilityError("browser-control", "Deterministic browser open is unavailable", {
        suggestion:
          "Configure a deterministic browser sidecar before opening interactive sessions.",
        statusCode: 503,
      });
    }
    return this.#deterministic.open(url, {
      tenantId,
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
    });
  }

  async replay(sessionId: string, options: { tenantId?: string } = {}): Promise<BrowserTaskResult> {
    const tenantId = requireTenant(options.tenantId, this.#tenantId);
    const recording = await this.#recorder.load(tenantId, sessionId);
    if (!recording) {
      throw new CapabilityError("browser-control", "Browser recording not found", {
        suggestion:
          "Run `pnpm browser:debug <session_id>` or execute the task once before replaying it.",
        metadata: { sessionId, tenantId },
        statusCode: 404,
      });
    }
    const result = await this.#deterministic.replay(recording);
    await appendDebug(this.#root, { type: "replay", tenantId, sessionId, result });
    return result;
  }

  async doctor(): Promise<BrowserHealth[]> {
    const checks = [await this.#deterministic.doctor()];
    if (this.#explorer) {
      checks.push(await this.#explorer.doctor());
    } else {
      checks.push({
        provider: "first_run",
        ok: false,
        suggestion: "Configure the first-run browser executor to explore task-shaped pages.",
      });
    }
    await appendDebug(this.#root, { type: "doctor", checks });
    return checks;
  }

  async #runDeterministic(task: RequiredTenant<BrowserTask>): Promise<BrowserTaskResult> {
    if (!task.startUrl) {
      throw new CapabilityError("browser-control", "Deterministic browser task needs a startUrl", {
        suggestion: "Pass startUrl or use a configured first-run browser executor.",
        statusCode: 400,
      });
    }
    const session = await this.open(task.startUrl, { tenantId: task.tenantId });
    const output = await session.extract(task.objective);
    const actions = [
      { type: "navigate", url: task.startUrl, at: new Date().toISOString() },
      { type: "extract", instruction: task.objective, value: output, at: new Date().toISOString() },
    ] satisfies readonly BrowserAction[];
    const result: BrowserTaskResult = {
      sessionId: session.id,
      strategy: "deterministic",
      output,
      actions,
    };
    await this.#saveRecording(task, result);
    await session.close();
    return result;
  }

  async #saveRecording(
    task: RequiredTenant<BrowserTask>,
    result: BrowserTaskResult,
  ): Promise<void> {
    const sessionId = result.sessionId || sessionIdFrom(task);
    const recording: BrowserRecording = {
      tenantId: task.tenantId,
      sessionId,
      ...(task.taskId ? { taskId: task.taskId } : {}),
      strategy: result.strategy,
      createdAt: new Date().toISOString(),
      ...(task.startUrl ? { startUrl: task.startUrl } : {}),
      actions: result.actions,
    };
    await this.#recorder.save(recording);
    await appendDebug(this.#root, {
      type: "recording",
      tenantId: task.tenantId,
      sessionId,
      strategy: result.strategy,
      actions: result.actions.length,
    });
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html: string, base: string): string[] {
  const links: string[] = [];
  const pattern = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) continue;
    try {
      links.push(new URL(raw, base).toString());
    } catch {
      links.push(raw);
    }
  }
  return Array.from(new Set(links));
}
