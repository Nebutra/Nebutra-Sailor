import { AuthJsIdentityAdapter } from "./adapters/authjs";
import { ClerkIdentityAdapter } from "./adapters/clerk";
import { NebutraIdentityAdapter } from "./adapters/nebutra";
import { IdentityAdapterRegistry } from "./types";

export function createDefaultIdentityAdapterRegistry(): IdentityAdapterRegistry {
  const registry = new IdentityAdapterRegistry();
  registry.register(new ClerkIdentityAdapter());
  registry.register(new AuthJsIdentityAdapter());
  registry.register(new NebutraIdentityAdapter());
  return registry;
}
