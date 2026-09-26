import type { CanonicalIdentity } from "@nebutra/contracts";

export type IdentityProvider = "nebutra" | "custom";

export interface IdentityAdapter<TInput = unknown> {
  provider: IdentityProvider | string;
  mapToCanonical(input: TInput): CanonicalIdentity | null;
}

export class IdentityAdapterRegistry {
  private readonly adapters = new Map<string, IdentityAdapter>();

  register(adapter: IdentityAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): IdentityAdapter | undefined {
    return this.adapters.get(provider);
  }

  map<TInput = unknown>(provider: string, input: TInput): CanonicalIdentity | null {
    const adapter = this.get(provider);
    if (!adapter) {
      return null;
    }
    return adapter.mapToCanonical(input);
  }
}
