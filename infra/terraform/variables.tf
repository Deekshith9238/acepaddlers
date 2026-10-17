variable "project_name" {
  type    = string
  default = "acepaddlers"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type        = string
  default     = "ap-south-1" # Mumbai
  description = "Primary region. India-based business → ap-south-1."
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

# ── Database ──
variable "db_name" {
  type    = string
  default = "acepaddlers"
}
variable "db_username" {
  type    = string
  default = "acepaddlers"
}
variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}
variable "db_allocated_storage" {
  type    = number
  default = 20
}
variable "db_multi_az" {
  type    = bool
  default = false
}

# ── API container ──
variable "api_image_tag" {
  type        = string
  default     = "latest"
  description = "ECR image tag the ECS service deploys."
}

# Sized against 30 days of production metrics: CPU averaged 0% and peaked 6%;
# memory peaked at 8.3% of 2 GB (~170 MB). 0.5 vCPU / 1 GB keeps roughly 6x
# headroom while leaving enough CPU for the bursty image (sharp) and video
# (ffmpeg) work the container shells out to.
variable "api_cpu" {
  type    = string
  default = "512" # 0.5 vCPU
}
variable "api_memory" {
  type    = string
  default = "1024" # 1 GB
}

# ── Application config / secrets (set in terraform.tfvars; never commit real values) ──
variable "admin_email" {
  type    = string
  default = "admin@acepaddlers.com"
}
variable "admin_password" {
  type      = string
  sensitive = true
  default   = "change-me-in-tfvars"
}
variable "admin_name" {
  type    = string
  default = "Ace Admin"
}
variable "notify_emails" {
  type    = string
  default = ""
}
variable "notify_phones" {
  type    = string
  default = ""
}
variable "ses_domain" {
  type        = string
  default     = ""
  description = "Domain to verify with SES for sending mail (e.g. acepaddlers.com). Empty = skip."
}

variable "web_domain" {
  type        = string
  default     = ""
  description = "Custom domain to serve the SPA over HTTPS via CloudFront (e.g. www.acepaddlers.com). Empty = skip CloudFront."
}
variable "ses_from_email" {
  type    = string
  default = "bookings@acepaddlers.com"
}

# Resend — the active email provider. Takes priority over SES when set.
variable "resend_api_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Resend API key (re_...). Empty = fall back to SES."
}
variable "resend_from_email" {
  type        = string
  default     = ""
  description = "From address for Resend, e.g. \"Ace Paddlers <bookings@acepaddlers.com>\". Its domain must be verified in the Resend dashboard."
}

variable "google_client_id" {
  type      = string
  sensitive = true
  default   = ""
}
variable "google_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}
variable "google_redirect_uri" {
  type    = string
  default = ""
}
variable "whatsapp_token" {
  type      = string
  sensitive = true
  default   = ""
}
variable "whatsapp_phone_number_id" {
  type    = string
  default = ""
}
variable "whatsapp_verify_token" {
  type        = string
  default     = ""
  description = "Arbitrary string you also enter in Meta's webhook config."
}
variable "razorpay_key_id" {
  type        = string
  default     = ""
  description = "Razorpay API key id (rzp_live_... / rzp_test_...)."
}
variable "razorpay_key_secret" {
  type      = string
  sensitive = true
  default   = ""
}
variable "razorpay_webhook_secret" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Arbitrary string you also enter in the Razorpay dashboard webhook config."
}

# ── Firebase sign-in ──
# Only the project id is needed to *verify* ID tokens — the signing keys are
# Google's and public, so no service-account key is stored anywhere.
variable "firebase_project_id" {
  type        = string
  default     = ""
  description = "Firebase project id. Empty = Firebase sign-in is off and only password login is offered."
}
variable "firebase_api_key" {
  type        = string
  default     = ""
  description = "Firebase web API key. Public by design — it ships in the browser bundle."
}
variable "firebase_auth_domain" {
  type        = string
  default     = ""
  description = "Leave empty: the API then serves its own host, which is what the /__/auth proxy needs. Set it only to pin a different sign-in domain."
}
