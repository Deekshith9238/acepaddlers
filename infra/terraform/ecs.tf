resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
  tags = { Name = "${local.name}-cluster" }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 7
  tags              = { Name = "${local.name}-api" }
}

resource "aws_lb" "api" {
  name               = "${local.name}-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = { Name = "${local.name}-api-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/healthz"
    port                = "8080"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
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
      secrets = [
        for k, v in local.app_secrets : {
          name      = k
          valueFrom = aws_secretsmanager_secret_version.app[k].arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "${local.name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    # A public subnet plus a public IP replaces the NAT gateway as this task's
    # route out (Razorpay, Meta, Resend, ECR pulls). Inbound is unchanged and
    # still closed: ecs_tasks only accepts port 8080 from the ALB's group.
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  depends_on = [
    aws_lb_listener.api,
    aws_iam_role_policy.ecs_execution_secrets
  ]
}
