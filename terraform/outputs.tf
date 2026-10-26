output "region" {
  description = "AWS region."
  value       = var.aws_region
}

output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API endpoint."
  value       = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  description = "Push StreamVault images here."
  value       = aws_ecr_repository.app.repository_url
}

output "configure_kubectl" {
  description = "Command that writes a kubeconfig entry for this cluster."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "load_balancer_controller_role_arn" {
  description = "IRSA role used by the AWS Load Balancer Controller."
  value       = module.lb_controller_irsa.iam_role_arn
}

output "cluster_autoscaler_role_arn" {
  description = "IRSA role used by the cluster autoscaler."
  value       = module.cluster_autoscaler_irsa.iam_role_arn
}

output "vpc_id" {
  description = "VPC that hosts the cluster."
  value       = module.vpc.vpc_id
}
