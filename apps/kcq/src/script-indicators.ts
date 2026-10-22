/** Register the canonical script catalog after persistence scope is configured. */
import { SCRIPT_SOURCE_STORE_KEY } from "@363045841yyt/klinechart";
import { createBuiltinScriptService } from "@363045841yyt/klinechart-script-chart";
import type { App } from "vue";

export async function initializeScriptIndicators(app: App): Promise<void> {
  const scripts = await createBuiltinScriptService();
  app.onUnmount(() => scripts.dispose());
  app.provide(SCRIPT_SOURCE_STORE_KEY, scripts);
}
