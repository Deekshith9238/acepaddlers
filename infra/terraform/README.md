# Ace Paddlers — AWS deployment (Terraform)

Provisions: VPC + NAT, RDS PostgreSQL, ECR, App Runner (API), S3 + CloudFront
(SPA), S3 + CloudFront + MediaConvert (media), SES, Secrets Manager, IAM.

Region default: **ap-south-1 (Mumbai)**.

## Prerequisites
- AWS account + credentials (`aws configure` / SSO) with admin-ish rights.
- `terraform` ≥ 1.6 (or `tofu`), `docker`, `aws` CLI, `pnpm`.
- `cp terraform.tfvars.example terraform.tfvars` and fill it in. **Never commit `terraform.tfvars`.**

## 1. Bootstrap the registry, then push the API image
App Runner needs the image to exist before the service is created, so create ECR first:

```bash
cd infra/terraform
terraform init
terraform apply -target=aws_ecr_repository.api

# Build & push (from repo root, amd64 for App Runner):
REPO=$(terraform -chdir=infra/terraform output -raw ecr_repository_url)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "${REPO%/*}"
docker build --platform linux/amd64 -f artifacts/api-server/Dockerfile -t "$REPO:latest" .
docker push "$REPO:latest"
```

## 2. Apply the full stack
```bash
terraform apply
```
Outputs include `web_url`, `api_url`, `ecr_repository_url`, `media_bucket`, `web_bucket`, `web_cloudfront_id`, `ses_dkim_tokens`.

## 3. Database migrations
RDS is private. Easiest options:
- **Recommended:** add migrate-on-boot to the API (run drizzle migrations at startup), or
- Run from AWS CloudShell/a bastion inside the VPC:
  ```bash
  DATABASE_URL=postgresql://… pnpm --filter @workspace/db run migrate
  DATABASE_URL=postgresql://… pnpm --filter @workspace/scripts run seed   # optional content seed
  ```
The first admin user is created automatically from `ADMIN_EMAIL`/`ADMIN_PASSWORD` on API start.

## 4. Deploy the frontend
The SPA calls `/api` and `/media` relatively; CloudFront routes them to App Runner and the media bucket, so no API URL is baked in.
```bash
pnpm --filter @workspace/ace-paddlers run build
WEB=$(terraform -chdir=infra/terraform output -raw web_bucket)
DIST=$(terraform -chdir=infra/terraform output -raw web_cloudfront_id)
aws s3 sync artifacts/ace-paddlers/dist "s3://$WEB" --delete
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*"
```

## 5. Integrations
- **SES:** add the `ses_dkim_tokens` as CNAMEs on your domain, verify the identity, and request production access (sandbox only emails verified addresses).
- **Google Calendar:** set the OAuth redirect URI to `https://<web_url>/api/admin/integrations/google/callback` in Google Cloud, and put the client id/secret in `terraform.tfvars`.
- **WhatsApp:** put the Meta Cloud API token + phone number id in `terraform.tfvars`.

## Still required in app code (next step)
The infra wires `MEDIA_BUCKET`, `MEDIA_CDN_URL`, `MEDIACONVERT_*`, `SES_FROM_EMAIL` into the API, but the **AWS implementations** of `StorageProvider` (S3), `Transcoder` (MediaConvert) and `Mailer` (SES) still need to be written (they currently default to local disk/console). Until then the API runs on App Runner but media uploads use ephemeral container disk and email/WhatsApp log only.

## Costs & teardown
Roughly: NAT gateway (~$32/mo) + App Runner + RDS t4g.micro + CloudFront/S3. `terraform destroy` removes everything — note RDS has `deletion_protection = true` and takes a final snapshot; set `deletion_protection = false` and re-apply first if you really want to delete it.
