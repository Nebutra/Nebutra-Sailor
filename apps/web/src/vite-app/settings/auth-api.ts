import { resolveApiUrl } from "@/lib/api/browser-client";

/** Better Auth, through the app's /api proxy. Throws with the service's own message. */
export async function authRequest<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {},
): Promise<T> {
  const response = await fetch(resolveApiUrl(`/api/auth/${path}`), {
    method: init.method ?? "GET",
    credentials: "include",
    headers: init.body
      ? { accept: "application/json", "content-type": "application/json" }
      : { accept: "application/json" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}
