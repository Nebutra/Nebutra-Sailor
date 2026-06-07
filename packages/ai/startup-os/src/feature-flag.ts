export function isStartupOSPrototypeEnabled(
  env: { readonly NODE_ENV?: string; readonly STARTUP_AGENT_OS_PROTOTYPE?: string } = process.env,
) {
  return env.NODE_ENV !== "production" || env.STARTUP_AGENT_OS_PROTOTYPE === "1";
}
