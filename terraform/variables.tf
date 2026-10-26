variable "aws_region" {
  description = "AWS region for the cluster and ECR repository."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Short project name used in resource names."
  type        = string
  default     = "streamvault"
}

variable "environment" {
  description = "Environment suffix, for example dev or prod."
  type        = string
  default     = "dev"
}

variable "owner" {
  description = "Owner tag for every resource."
  type        = string
  default     = "VedarthamSaaket"
}

variable "cluster_version" {
  description = "EKS control plane version."
  type        = string
  default     = "1.31"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "node_instance_types" {
  description = "Instance types for the managed node group."
  type        = list(string)
  default     = ["t3.large"]
}

variable "node_desired_size" {
  description = "Desired node count."
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum node count for the cluster autoscaler."
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum node count for the cluster autoscaler."
  type        = number
  default     = 6
}

variable "extra_tags" {
  description = "Additional tags merged into every resource."
  type        = map(string)
  default     = {}
}
