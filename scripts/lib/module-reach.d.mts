export function isAuxiliary(rel: string): boolean;
export function resolveSpecifier(src: string, fromFile: string, spec: string): string | null;
export function localImports(file: string): string[];
export function moduleReach(appDir: string): {
  sources: string[];
  reachable: Set<string>;
  unreachable: string[];
};
