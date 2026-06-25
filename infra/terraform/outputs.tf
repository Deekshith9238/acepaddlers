output "api_url" {
  description = "App Runner API URL"
  value       = aws_apprunner_service.api.service_url
}

output "web_url" {
  description = "Public site (CloudFront)"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "web_bucket" {
  description = "S3 bucket to upload the Vite build to"
  value       = aws_s3_bucket.frontend.bucket
}

output "web_cloudfront_id" {
  description = "CloudFront distribution id (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "media_cdn_url" {
  value = "https://${aws_cloudfront_distribution.media.domain_name}"
}

output "ecr_repository_url" {
  description = "Push the API image here"
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "ses_dkim_tokens" {
  description = "Add these as CNAME records to verify SES (if ses_domain set)"
  value       = try(aws_ses_domain_dkim.main[0].dkim_tokens, [])
}
