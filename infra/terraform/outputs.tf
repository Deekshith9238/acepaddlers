output "api_url" {
  description = "ALB API URL"
  value       = "http://${aws_lb.api.dns_name}"
}

output "web_url" {
  description = "Public site (S3 Website Endpoint)"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "web_bucket" {
  description = "S3 bucket to upload the Vite build to"
  value       = aws_s3_bucket.frontend.bucket
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "media_cdn_url" {
  value = "https://${aws_s3_bucket.media.bucket_regional_domain_name}"
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
