# Nebutra-Sailor Terraform Infrastructure

Multi-cloud infrastructure-as-code for Nebutra-Sailor.
Supports **AWS**, **Alibaba Cloud (Aliyun)**, and **Tencent Cloud** as deployment targets,
with Vercel still available for preview / lightweight deployments.

---

## Directory layout

```
infra/iac/terraform/
├── main.tf                          # Root config (Vercel / legacy)
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
│       └── main.tf                  # Production entrypoint (multi-cloud)
└── modules/
    ├── aws/main.tf                  # AWS module
    ├── aliyun/main.tf               # Alibaba Cloud module
    └── tencent/main.tf              # Tencent Cloud module
```

---

## 1. Selecting a cloud provider

Set `cloud_provider` to one of: `aws` | `aliyun` | `tencent` | `vercel`

```bash
# via CLI flag
terraform apply -var="cloud_provider=aws"

# via environment variable
export TF_VAR_cloud_provider=aliyun
terraform apply

# via terraform.tfvars (recommended for teams)
echo 'cloud_provider = "tencent"' >> infra/iac/terraform/environments/prod/terraform.tfvars
```

---

## 2. Required credentials per provider

### AWS

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"
# Optional: assume a specific role
export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/TerraformRole"
```

### Alibaba Cloud

```bash
export ALICLOUD_ACCESS_KEY="..."
export ALICLOUD_SECRET_KEY="..."
export ALICLOUD_REGION="cn-hangzhou"
# Sensitive variable overrides
export TF_VAR_db_password="..."
export TF_VAR_redis_password="..."
```

### Tencent Cloud

```bash
export TENCENTCLOUD_SECRET_ID="..."
export TENCENTCLOUD_SECRET_KEY="..."
export TENCENTCLOUD_REGION="ap-guangzhou"
# Sensitive variable overrides
export TF_VAR_db_password="..."
export TF_VAR_redis_password="..."
# COS bucket names must include the Tencent AppID
export TF_VAR_cos_bucket_suffix="1234567890"  # your AppID
```

### Vercel

```bash
export TF_VAR_vercel_api_token="..."
```

---

## 3. State management

Each provider has a corresponding remote backend. Only one backend block may
be active at a time. Edit `environments/prod/main.tf` and uncomment the
matching backend block before running `terraform init`.

| Provider | Backend type | Pre-requisite |
| -------- | ------------ | ------------- |
| AWS | S3 + DynamoDB lock table | Create bucket `nebutra-terraform-state-prod` and DynamoDB table `nebutra-terraform-locks` |
| Alibaba Cloud | OSS + TableStore lock | Create OSS bucket and TableStore instance |
| Tencent Cloud | COS | Create COS bucket `nebutra-terraform-state-prod-<AppID>` |

---

## 4. Workflow – init, plan, apply

### First-time setup (choose one block)

```bash
# AWS
cd infra/iac/terraform/environments/prod
terraform init \
  -backend-config="bucket=nebutra-terraform-state-prod" \
  -backend-config="key=sailor/prod/terraform.tfstate" \
  -backend-config="region=us-east-1"

# Alibaba Cloud
terraform init \
  -backend-config="bucket=nebutra-terraform-state-prod" \
  -backend-config="prefix=sailor/prod" \
  -backend-config="region=cn-hangzhou"

# Tencent Cloud
terraform init \
  -backend-config="bucket=nebutra-terraform-state-prod-1234567890" \
  -backend-config="region=ap-guangzhou" \
  -backend-config="prefix=sailor/prod"
```

### Plan and apply

```bash
# Preview changes (AWS example)
terraform plan -var="cloud_provider=aws" -out=tfplan

# Apply the saved plan
terraform apply tfplan

# Destroy (use with extreme caution in prod)
terraform destroy -var="cloud_provider=aws"
```

---

## 5. Common one-liners

```bash
# Show all outputs after apply
terraform output -json

# Refresh state without applying changes
terraform refresh -var="cloud_provider=aws"

# Format all .tf files
terraform fmt -recursive infra/iac/terraform/

# Validate configuration syntax
terraform validate

# List all resources in state
terraform state list

# Import an existing resource (example: AWS S3 bucket)
terraform import -var="cloud_provider=aws" \
  module.aws[0].aws_s3_bucket.assets \
  nebutra-prod-assets-123456789012

# Target a single resource during apply
terraform apply -var="cloud_provider=aws" \
  -target=module.aws[0].aws_eks_cluster.main
```

---

## 6. Post-provisioning steps

### pgvector (all providers)

After the PostgreSQL instance is reachable, install the vector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

On **Alibaba Cloud RDS** pgvector is not available natively.
Consider PolarDB-PG or a self-managed PostgreSQL instance on ECS.
On **Tencent Cloud**, enable the `vector` plugin from the console under
"Database Management > Plugin Management".

### Docker image push (AWS example)

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $REGISTRY

docker build -f apps/web/Dockerfile -t $REGISTRY/nebutra-prod/web:latest .
docker push $REGISTRY/nebutra-prod/web:latest
```

---

## 7. Notes

- Never commit `terraform.tfvars` files containing secrets to version control.
- Use `sensitive = true` on all password/token variables (already done in modules).
- The `environments/prod/main.tf` uses `count = ... ? 1 : 0` to activate only
  the module matching the selected provider, keeping plan output clean.
- Module outputs are conditionally surfaced as `aws_outputs`, `aliyun_outputs`,
  and `tencent_outputs` at the environment level.

## Related

- [Cloudflare config](../cloudflare/) — CDN and DNS
- [Database config](../database/) — RLS policies
