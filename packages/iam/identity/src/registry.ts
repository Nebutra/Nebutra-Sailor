import { NebutraIdentityAdapter } from "./adapters/nebutra";
import { IdentityAdapterRegistry } from "./types";

export function createDefaultIdentityAdapterRegistry(): IdentityAdapterRegistry {
  const registry = new IdentityAdapterRegistry();
  registry.register(new NebutraIdentityAdapter());
  return registry;
}
