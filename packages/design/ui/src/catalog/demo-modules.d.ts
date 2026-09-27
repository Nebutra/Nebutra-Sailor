/**
 * Each demo is loaded through DEMO_LOADERS by its public specifier. It is typed
 * here, not resolved to its source, so the declaration build does not check
 * every demo again for one `ComponentType` per loader.
 */
declare module "@nebutra/ui/catalog/demos/*" {
  const demo: unknown;
  export default demo;
}
