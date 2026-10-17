# ── GitHub Actions: build and deploy from the cloud ──
# GitHub proves who it is to AWS with a short-lived OIDC token, so no AWS key
# is stored in GitHub. The role below can only push this one image repository,
# run the deploy document on the web server, and snapshot the database before a
# deploy that migrates it — nothing else.

variable "github_repo" {
  description = "owner/name of the repository allowed to deploy"
  type        = string
  default     = "Deekshith9238/acepaddlers"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS trusts GitHub's OIDC root CA itself; the list only has to be well-formed.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

resource "aws_iam_role" "github_deploy" {
  name = "${local.name}-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        # Branches of this repository only — never a pull request, whose
        # token carries ":pull_request" instead of a ref.
        StringLike = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/heads/*" }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "deploy"
  role = aws_iam_role.github_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrLogin"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages",
        ]
        Resource = aws_ecr_repository.api.arn
      },
      {
        Sid    = "Deploy"
        Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = [
          aws_ssm_document.deploy.arn,
          "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/${aws_instance.web.id}",
        ]
      },
      {
        Sid      = "DeployResult"
        Effect   = "Allow"
        Action   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
        Resource = "*"
      },
      {
        Sid    = "SnapshotBeforeMigrations"
        Effect = "Allow"
        Action = ["rds:CreateDBSnapshot", "rds:AddTagsToResource"]
        Resource = [
          aws_db_instance.main.arn,
          "arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:snapshot:${local.name}-predeploy-*",
        ]
      },
      {
        Sid      = "SnapshotStatus"
        Effect   = "Allow"
        Action   = ["rds:DescribeDBSnapshots"]
        Resource = "*"
      },
    ]
  })
}

output "github_deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE in .github/workflows/deploy.yml"
  value       = aws_iam_role.github_deploy.arn
}
