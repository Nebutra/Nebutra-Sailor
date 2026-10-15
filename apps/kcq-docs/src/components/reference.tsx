/** Small presentational pieces the generated reference pages use. */
import { ExternalIcon } from "./icons";

export function ToolMeta({
  label,
  safety,
  safetyLabel,
  mode,
  origin,
  source,
  sourceLabel,
}: {
  label: string;
  safety: "read-only" | "destructive";
  safetyLabel: string;
  mode?: string;
  origin: string;
  source: string;
  sourceLabel: string;
}) {
  return (
    <p className="kcq-meta">
      <span className="kcq-meta-label">{label}</span>
      <span className="kcq-badge" data-safety={safety}>
        {safetyLabel}
      </span>
      {mode ? <span className="kcq-badge">{mode}</span> : null}
      <span className="kcq-badge">{origin}</span>
      <a className="kcq-meta-link" href={source} rel="noopener">
        {sourceLabel}
        <ExternalIcon width={12} height={12} />
      </a>
    </p>
  );
}

export function PackageMeta({
  version,
  npm,
  source,
}: {
  version: string;
  npm: string;
  source: string;
}) {
  return (
    <p className="kcq-meta">
      <span className="kcq-badge">v{version}</span>
      <a className="kcq-meta-link" href={npm} rel="noopener">
        npm
        <ExternalIcon width={12} height={12} />
      </a>
      <a className="kcq-meta-link" href={source} rel="noopener">
        GitHub
        <ExternalIcon width={12} height={12} />
      </a>
    </p>
  );
}

export function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <p className="kcq-endpoint">
      <span className="kcq-endpoint-method">{method}</span>
      <code>{path}</code>
    </p>
  );
}
