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
  description = "ECR image tag App Runner deploys."
}
variable "api_cpu" {
  type    = string
  default = "1024" # 1 vCPU
}
variable "api_memory" {
  type    = string
  default = "2048" # 2 GB
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
variable "ses_from_email" {
  type    = string
  default = "bookings@acepaddlers.com"
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
