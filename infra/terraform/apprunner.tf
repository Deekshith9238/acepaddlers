resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = local.name
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner.id]
}

resource "aws_apprunner_service" "api" {
  service_name = "${local.name}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }
    auto_deployments_enabled = false
    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      image_repository_type = "ECR"
      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          PORT                     = "8080"
          NODE_ENV                 = "production"
          AWS_REGION               = var.aws_region
          ADMIN_EMAIL              = var.admin_email
          ADMIN_NAME               = var.admin_name
          NOTIFY_EMAILS            = var.notify_emails
          NOTIFY_PHONES            = var.notify_phones
          SES_FROM_EMAIL           = var.ses_from_email
          GOOGLE_CLIENT_ID         = var.google_client_id
          GOOGLE_REDIRECT_URI      = var.google_redirect_uri
          WHATSAPP_PHONE_NUMBER_ID = var.whatsapp_phone_number_id
          # Media providers (consumed by the AWS storage/transcoder impls)
          MEDIA_BUCKET          = aws_s3_bucket.media.bucket
          MEDIA_CDN_URL         = "https://${aws_cloudfront_distribution.media.domain_name}"
          MEDIACONVERT_QUEUE    = aws_media_convert_queue.main.arn
          MEDIACONVERT_ROLE_ARN = aws_iam_role.mediaconvert.arn
        }
        runtime_environment_secrets = {
          for k, s in aws_secretsmanager_secret.app : k => s.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.api_cpu
    memory            = var.api_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol = "HTTP"
    path     = "/api/healthz"
    interval = 10
    timeout  = 5
  }

  depends_on = [aws_secretsmanager_secret_version.app]
}
