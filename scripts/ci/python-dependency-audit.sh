#!/usr/bin/env bash
set -euo pipefail

AUDIT_TMP=$(mktemp -d)
trap 'rm -rf "$AUDIT_TMP"' EXIT
REPORT_DIR="artifacts/security/python"
mkdir -p "$REPORT_DIR"
FAILED=0
SERVICES=0

for service in backends/python/*/; do
  [ -f "$service/pyproject.toml" ] || continue
  SERVICES=$((SERVICES + 1))
  name=$(basename "$service")
  requirements="$AUDIT_TMP/$name-requirements.txt"
  report="$REPORT_DIR/$name.json"
  echo "Auditing $service..."
  # A failed resolution must stop the scan; each service gets a fresh file.
  uv pip compile "$service/pyproject.toml" -o "$requirements" --quiet
  rm -f "$report"
  status=0
  # uv has already resolved the complete transitive graph to exact versions.
  # Audit that graph directly instead of creating a second pip environment.
  pip-audit -r "$requirements" --no-deps --disable-pip --strict --format=json --output "$report" || status=$?
  if [ "$status" -gt 1 ]; then
    echo "::error::pip-audit failed for $name (exit $status)" >&2
    exit 1
  fi
  # Exit 1 is also used for operational errors. Only a complete report with
  # actual findings is allowed to proceed to the existing notification step.
  count=$(python3 - "$report" "$status" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as source:
    report = json.load(source)
dependencies = report.get("dependencies") if isinstance(report, dict) else None
if not isinstance(dependencies, list) or not dependencies:
    raise SystemExit("Missing Python dependency audit evidence")
count = 0
for dependency in dependencies:
    if (not isinstance(dependency, dict) or dependency.get("skip_reason")
            or not dependency.get("name") or not dependency.get("version")
            or not isinstance(dependency.get("vulns"), list)):
        raise SystemExit("Incomplete Python dependency audit evidence")
    for vulnerability in dependency["vulns"]:
        if not isinstance(vulnerability, dict) or not vulnerability.get("id"):
            raise SystemExit("Invalid Python vulnerability evidence")
        count += 1
if int(sys.argv[2]) != int(count > 0):
    raise SystemExit("Python audit exit status disagrees with report")
print(count)
PY
  )
  if [ "$count" -gt 0 ]; then FAILED=1; fi
done

if [ "$SERVICES" -eq 0 ]; then
  echo "::error::No Python services found; scan did not run" >&2
  exit 1
fi
echo "failed=$FAILED" >> "${GITHUB_OUTPUT:?GITHUB_OUTPUT must be set}"
