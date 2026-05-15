# infra

Infrastructure-as-code, runtime configs, data pipelines, and ops scripts for `{PRODUCT_NAME}`.

| Folder | Purpose |
|--------|---------|
| `iac/` | Terraform / Pulumi / CDK — provisioning cloud resources |
| `runtime/` | Container, edge, and serverless runtime configs (Dockerfiles, fly.toml, etc.) |
| `data/` | DB migrations, ETL definitions, ClickHouse schemas |
| `ops/` | Operational scripts (backup, restore, on-call runbooks) |
