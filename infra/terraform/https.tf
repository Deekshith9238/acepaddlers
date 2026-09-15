# ── HTTPS on the ALB for the custom domain ──
# The SPA is served by the API container; the ALB terminates TLS for web_domain.
# Regional (ap-south-1) ACM cert, DNS-validated by a CNAME added at GoDaddy.
# Point web_domain (www) at the ALB's DNS name once issued. Enabled when web_domain is set.

locals {
  https_enabled = var.web_domain != "" ? 1 : 0
}

resource "aws_acm_certificate" "alb" {
  count             = local.https_enabled
  domain_name       = var.web_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Blocks until the validation CNAME (added at GoDaddy) makes the cert ISSUED.
resource "aws_acm_certificate_validation" "alb" {
  count                   = local.https_enabled
  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [for o in aws_acm_certificate.alb[0].domain_validation_options : o.resource_record_name]
}

# HTTPS listener — forwards to the same target group as the :80 listener.
# (The :80 listener stays as-is so the current Vercel site can keep calling the
# ALB over HTTP until cutover.)
resource "aws_lb_listener" "api_https" {
  count             = local.https_enabled
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.alb[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
