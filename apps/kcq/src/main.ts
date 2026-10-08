/** Verify identity before importing modules that create chart persistence. */

import { configureBrowserPersistenceScope } from "@363045841yyt/klinechart-core/persistence-scope";
import { createAuthCenterBrowserClient } from "@nebutra/auth/browser";
import { createApp } from "vue";
import "./styles.css";

const auth = createAuthCenterBrowserClient("https://auth.nebutra.com");
async function boot() {
  const context = await auth.getContext();
  const workspace = context?.activeWorkspaceId;
  if (workspace && !context.workspaces.some((org) => org.id === workspace)) {
    throw new Error("当前工作区已不可访问，请重新登录 Nebutra。");
  }
  const scope = JSON.stringify([
    "nebutra-kcq",
    context?.user.id ?? "guest",
    workspace ?? "personal",
  ]);
  configureBrowserPersistenceScope(scope);
  const { default: App } = await import("./workbench.vue");
  const app = createApp(App, { context, auth, scope });
  app.mount("#app");
  let checking = false;
  async function revalidate() {
    if (document.visibilityState !== "visible" || checking) return;
    checking = true;
    try {
      const latest = await auth.getContext();
      if (
        latest?.user.id !== context?.user.id ||
        latest?.activeWorkspaceId !== context?.activeWorkspaceId ||
        (latest?.activeWorkspaceId &&
          !latest.workspaces.some((org) => org.id === latest.activeWorkspaceId))
      ) {
        app.unmount();
        window.location.reload();
      }
    } catch {
      app.unmount();
      showError(new Error("登录状态验证失败，请刷新后重试。"));
      window.clearInterval(timer);
      window.removeEventListener("focus", revalidate);
    } finally {
      checking = false;
    }
  }
  const timer = window.setInterval(revalidate, 60_000);
  window.addEventListener("focus", revalidate);
}
function showError(error: unknown) {
  const root = document.getElementById("app");
  if (!root) return;
  root.replaceChildren();
  const message = document.createElement("p");
  message.className = "boot-error";
  message.setAttribute("role", "alert");
  message.textContent = error instanceof Error ? error.message : "无法打开 KCQ。";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "boot-retry";
  retry.textContent = "重新加载";
  retry.onclick = () => window.location.reload();
  root.append(message, retry);
}
void boot().catch(showError);
