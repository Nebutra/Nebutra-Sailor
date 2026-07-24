export async function register() {
  // Public landing deployments avoid loading the shared OpenTelemetry stack.
  // The API gateway owns full request tracing; keeping this hook no-op prevents
  // optional instrumentation packages from bloating the Vercel marketing build.
}
