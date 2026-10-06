resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
  tags = { Name = "${local.name}-cluster" }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 7
  tags              = { Name = "${local.name}-api" }
}

# The app's plain (non-secret) settings, written to Parameter Store for the web
# server (ec2.tf).
locals {
  app_env = [
    { name = "PORT", value = "8080" },
    { name = "NODE_ENV", value = "production" },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "ADMIN_EMAIL", value = var.admin_email },
    { name = "ADMIN_NAME", value = var.admin_name },
    { name = "NOTIFY_EMAILS", value = var.notify_emails },
    { name = "NOTIFY_PHONES", value = var.notify_phones },
    { name = "SES_FROM_EMAIL", value = var.ses_from_email },
    { name = "RESEND_FROM_EMAIL", value = var.resend_from_email },
    { name = "GOOGLE_CLIENT_ID", value = var.google_client_id },
    { name = "GOOGLE_REDIRECT_URI", value = var.google_redirect_uri },
    { name = "WHATSAPP_PHONE_NUMBER_ID", value = var.whatsapp_phone_number_id },
    { name = "WHATSAPP_VERIFY_TOKEN", value = var.whatsapp_verify_token },
    { name = "RAZORPAY_KEY_ID", value = var.razorpay_key_id },
    { name = "FIREBASE_PROJECT_ID", value = var.firebase_project_id },
    { name = "FIREBASE_API_KEY", value = var.firebase_api_key },
    { name = "FIREBASE_AUTH_DOMAIN", value = var.firebase_auth_domain },
    { name = "MEDIA_BUCKET", value = aws_s3_bucket.media.bucket },
    { name = "MEDIA_PUBLIC_BASE_URL", value = "https://${aws_s3_bucket.media.bucket_regional_domain_name}" }
  ]
}
