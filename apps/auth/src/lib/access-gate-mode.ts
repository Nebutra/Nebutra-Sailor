type AccessGateEnv = {
  ACCESS_GATE_MODE?: string;
  NEXT_PUBLIC_ACCESS_GATE_MODE?: string;
};

export function isAccessGateEnabled(env: AccessGateEnv = process.env as AccessGateEnv): boolean {
  return env.ACCESS_GATE_MODE === "invite" || env.NEXT_PUBLIC_ACCESS_GATE_MODE === "invite";
}
