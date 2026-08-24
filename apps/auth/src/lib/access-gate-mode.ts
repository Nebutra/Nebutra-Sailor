export function isAccessGateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ACCESS_GATE_MODE === "invite" || env.NEXT_PUBLIC_ACCESS_GATE_MODE === "invite";
}
