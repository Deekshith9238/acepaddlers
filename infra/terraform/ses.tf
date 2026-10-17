# Optional SES domain identity for sending mail. Set var.ses_domain to enable.
resource "aws_ses_domain_identity" "main" {
  count  = var.ses_domain != "" ? 1 : 0
  domain = var.ses_domain
}

resource "aws_ses_domain_dkim" "main" {
  count  = var.ses_domain != "" ? 1 : 0
  domain = aws_ses_domain_identity.main[0].domain
}
