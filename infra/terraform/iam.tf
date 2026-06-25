# ── App Runner: role to pull the image from ECR ──
resource "aws_iam_role" "apprunner_ecr" {
  name = "${local.name}-apprunner-ecr"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# ── App Runner: instance (runtime) role — what the API can do on AWS ──
resource "aws_iam_role" "apprunner_instance" {
  name = "${local.name}-apprunner-instance"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apprunner_instance" {
  name = "app-permissions"
  role = aws_iam_role.apprunner_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Media"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.media.arn, "${aws_s3_bucket.media.arn}/*"]
      },
      {
        Sid      = "Email"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Sid      = "Transcode"
        Effect   = "Allow"
        Action   = ["mediaconvert:CreateJob", "mediaconvert:GetJob", "mediaconvert:DescribeEndpoints"]
        Resource = "*"
      },
      {
        Sid      = "PassMediaConvertRole"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = aws_iam_role.mediaconvert.arn
      },
      {
        Sid      = "Secrets"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [for s in aws_secretsmanager_secret.app : s.arn]
      },
    ]
  })
}

# ── MediaConvert service role (assumed by the transcode job) ──
resource "aws_iam_role" "mediaconvert" {
  name = "${local.name}-mediaconvert"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "mediaconvert.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "mediaconvert" {
  name = "media-s3"
  role = aws_iam_role.mediaconvert.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.media.arn, "${aws_s3_bucket.media.arn}/*"]
    }]
  })
}
