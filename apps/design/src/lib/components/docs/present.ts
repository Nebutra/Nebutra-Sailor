/**
 * Drops `undefined` entries so the object can be spread into a component under
 * `exactOptionalPropertyTypes`, where `prop={undefined}` is not the same as
 * leaving the prop out.
 */
export function present<T extends Record<string, unknown>>(
  value: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}
