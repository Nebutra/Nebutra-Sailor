/**
 * Thin re-export stub for the `./registry` entry point.
 *
 * The real `registry.ts` is generated per-app by `create-sailor`
 * using the template at `templates/registry.ts.template`. This module
 * only exists so that consumers of `@nebutra/ai-providers/registry`
 * get a stable TypeScript surface during pre-generation tooling.
 *
 * In generated apps, this file is REPLACED by the rendered template.
 */

export type ProviderId = string;

export interface RegistryStub {
  __placeholder: true;
  message: string;
}

export const registry: RegistryStub = {
  __placeholder: true,
  message: "This registry stub should be replaced by a generated registry.ts via create-sailor.",
};
