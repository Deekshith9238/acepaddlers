# ── The web server: one small instance in place of the ALB + Fargate ──
# The site is a single container, so a load balancer in front of one task cost
# more than the task itself. Caddy on the instance terminates TLS (Let's
# Encrypt) and proxies to the app container; deploys go through SSM Run Command
# (document "${local.name}-deploy", see deploy.sh) — no SSH, no open port 22.

variable "web_instance_type" {
  # x86, so it runs the same linux/amd64 image Fargate did. 1 vCPU because the
  # account's standard-instance limit is 1 vCPU; t3a.small (2 GB) once raised.
  description = "Web server instance type"
  type        = string
  default     = "t2.micro"
}

data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_security_group" "web" {
  name_prefix = "${local.name}-web-"
  vpc_id      = aws_vpc.main.id
  description = "Web server (Caddy)"

  ingress {
    description = "HTTP - redirects to HTTPS, and certificate challenges"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "Plain HTTP from the old ALB while DNS moves"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }
  tags = { Name = "${local.name}-web" }
}

resource "aws_iam_role" "web" {
  name = "${local.name}-web"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "web_ssm" {
  role       = aws_iam_role.web.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "web_ecr" {
  role       = aws_iam_role.web.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "web_app" {
  name   = "app-permissions"
  role   = aws_iam_role.web.id
  policy = local.app_policy
}

resource "aws_iam_role_policy" "web_runtime" {
  name = "runtime"
  role = aws_iam_role.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Settings"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [for s in aws_secretsmanager_secret.app : s.arn]
      },
      {
        Sid      = "PlainSettings"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = aws_ssm_parameter.app_env.arn
      },
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.api.arn}:*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "web" {
  name = "${local.name}-web"
  role = aws_iam_role.web.name
}

# The app's plain settings as an env file; deploy.sh adds the secrets.
resource "aws_ssm_parameter" "app_env" {
  name  = "/${local.name}/env"
  type  = "String"
  value = join("\n", [for e in local.app_env : "${e.name}=${e.value}"])
}

resource "aws_instance" "web" {
  ami           = data.aws_ssm_parameter.al2023.value
  instance_type = var.web_instance_type
  # ap-south-1b: ap-south-1a had no t2.micro capacity on 2026-10-04.
  subnet_id              = aws_subnet.public[1].id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.web.name

  # Containers reach the instance role through IMDS, which is one hop further.
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 16
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    dnf install -y docker
    systemctl enable --now docker
    # 2 GB of swap: headroom while two app containers overlap during a deploy.
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  EOF

  lifecycle {
    # A newer AMI is not a reason to replace the server.
    ignore_changes = [ami, user_data]
  }

  tags = { Name = "${local.name}-web" }
}

resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
  tags     = { Name = "${local.name}-web" }
}

resource "aws_ssm_document" "deploy" {
  name          = "${local.name}-deploy"
  document_type = "Command"
  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy an image tag of the Ace Paddlers app on the web server"
    parameters = {
      tag = { type = "String", default = "latest", allowedPattern = "^[A-Za-z0-9._-]+$" }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "deploy"
      inputs = {
        timeoutSeconds = "900"
        runCommand = concat(
          ["mkdir -p /opt/acepaddlers", "cat > /opt/acepaddlers/deploy.sh <<'SCRIPT'"],
          split("\n", templatefile("${path.module}/deploy.sh", {
            name        = local.name
            repo        = aws_ecr_repository.api.repository_url
            region      = var.aws_region
            env_param   = aws_ssm_parameter.app_env.name
            secret_keys = join(" ", keys(local.app_secrets))
            log_group   = aws_cloudwatch_log_group.api.name
            domain      = var.web_domain
          })),
          ["SCRIPT", "bash /opt/acepaddlers/deploy.sh '{{ tag }}'"]
        )
      }
    }]
  })
}

# ── Cut-over plumbing on the old ALB (removed with it) ──
# Let's Encrypt's HTTP challenge for www arrives at the ALB until DNS moves, so
# the ALB passes /.well-known/acme-challenge/* to Caddy: the certificate is
# ready before the switch. Then the ALB's default action points at the server
# (:8080), so visitors whose DNS is stale still reach it.

resource "aws_security_group_rule" "alb_to_web" {
  for_each                 = toset(["80", "8080"])
  type                     = "egress"
  from_port                = tonumber(each.key)
  to_port                  = tonumber(each.key)
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.web.id
  security_group_id        = aws_security_group.alb.id
}

resource "aws_lb_target_group" "web_acme" {
  name        = "${local.name}-web-acme"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"
  health_check {
    path    = "/"
    port    = "80"
    matcher = "200-399"
  }
}

resource "aws_lb_target_group_attachment" "web_acme" {
  target_group_arn = aws_lb_target_group.web_acme.arn
  target_id        = aws_instance.web.id
  port             = 80
}

resource "aws_lb_listener_rule" "acme" {
  listener_arn = aws_lb_listener.api.arn
  priority     = 1
  condition {
    path_pattern { values = ["/.well-known/acme-challenge/*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_acme.arn
  }
}

resource "aws_lb_target_group" "web" {
  name        = "${local.name}-web"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"
  health_check {
    path                = "/api/healthz"
    port                = "8080"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group_attachment" "web" {
  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web.id
  port             = 8080
}

output "web_ip" {
  description = "Point www (an A record at GoDaddy) here"
  value       = aws_eip.web.public_ip
}
