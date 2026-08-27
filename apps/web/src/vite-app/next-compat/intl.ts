type TranslationValues = Record<string, string | number | Date | null | undefined>;

function formatKey(namespace: string | undefined, key: string, values?: TranslationValues) {
  const label = namespace ? `${namespace}.${key}` : key;
  if (!values) return label;
  return Object.entries(values).reduce(
    (current, [name, value]) => current.replaceAll(`{${name}}`, String(value ?? "")),
    label,
  );
}

export function useTranslations(namespace?: string) {
  return (key: string, values?: TranslationValues) => formatKey(namespace, key, values);
}

export function useLocale() {
  return "en";
}

export function useFormatter() {
  return {
    dateTime: (value: Date | number | string) => new Date(value).toLocaleString(),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat("en", options).format(value),
    relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit = "second") =>
      new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit),
  };
}
