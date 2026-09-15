# Individual Secrets Manager entries injected into App Runner as env vars.
locals {
  app_secrets = {
    DATABASE_URL            = local.database_url
    ADMIN_PASSWORD          = var.admin_password
    GOOGLE_CLIENT_SECRET    = var.google_client_secret
    WHATSAPP_TOKEN          = var.whatsapp_token
    RAZORPAY_KEY_SECRET     = var.razorpay_key_secret
    RAZORPAY_WEBHOOK_SECRET = var.razorpay_webhook_secret
    RESEND_API_KEY          = var.resend_api_key
  }
}

resource "aws_secretsmanager_secret" "app" {
  for_each = local.app_secrets
  name     = "${local.name}/${each.key}"
}

resource "aws_secretsmanager_secret_version" "app" {
  for_each      = local.app_secrets
  secret_id     = aws_secretsmanager_secret.app[each.key].id
  secret_string = each.value != "" ? each.value : "UNSET"
}
