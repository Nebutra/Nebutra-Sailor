/**
 * Preload for lingo.dev → SenseNova Token Plan.
 *
 * Official docs (OpenSenseNova/SenseNova6.7 API_CN.md):
 *   base: https://token.sensenova.cn/v1
 *   model: sensenova-6.7-flash-lite
 *
 * Flash-Lite defaults to *thinking* mode and may burn max_tokens on
 * `message.reasoning` with empty `content`. For bulk i18n we force
 * non-thinking: `{ "thinking": { "type": "disabled" } }`.
 *
 * Usage:
 *   NODE_OPTIONS="--import ./scripts/patch-sensenova-thinking.mjs" \
 *     OPENAI_API_KEY=$SENSENOVA_API_KEY \
 *     OPENAI_BASE_URL=https://token.sensenova.cn/v1 \
 *     npx lingo.dev@latest run
 */

const originalFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : (input?.url ?? String(input));
  if (
    typeof url === "string" &&
    url.includes("token.sensenova.cn") &&
    init.body &&
    typeof init.body === "string"
  ) {
    try {
      const body = JSON.parse(init.body);
      // Instruct / non-thinking mode — required for short translation outputs
      body.thinking = { type: "disabled" };
      if (typeof body.max_tokens !== "number" || body.max_tokens < 256) {
        body.max_tokens = 512;
      }
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      // leave body untouched if not JSON
    }
  }
  return originalFetch(input, init);
};
