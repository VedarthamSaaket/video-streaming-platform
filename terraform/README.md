# Terraform: AWS infrastructure for StreamVault

This stack provisions a production-shaped AWS environment for the Kubernetes deployment:

- VPC with three public and three private subnets, one NAT gateway per AZ
- EKS 1.31 control plane with IRSA enabled
- Managed node group, 3 to 6 `t3.large` nodes, labelled for the cluster autoscaler
- Core EKS add-ons including the EBS CSI driver for `gp3` persistent volumes
- ECR repository with image scanning and a 15 image lifecycle policy
- IRSA roles for the AWS Load Balancer Controller and the cluster autoscaler
- Helm releases for the load balancer controller, metrics-server and cluster autoscaler

It does not apply the StreamVault Kubernetes manifests. That stays in `k8s/overlays/cloud`, so the
same manifests can be reviewed and versioned separately.

## Prerequisites

- Terraform 1.6 or newer
- AWS credentials with permission to create VPC, EKS, IAM, ECR and EC2 resources
- `aws-cli` v2, `kubectl`, Docker

## Usage

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out streamvault.tfplan
terraform apply streamvault.tfplan
```

Configure kubectl:

```bash
$(terraform output -raw configure_kubectl)
kubectl get nodes
```

Build and push the image:

```bash
ECR_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "$ECR_URL"
docker build -t "$ECR_URL:1.0.0" ..
docker push "$ECR_URL:1.0.0"
```

Deploy the cloud overlay after pointing it at the image:

```bash
cd ..
kubectl apply -k k8s/overlays/cloud
kubectl -n streamvault get pods,hpa
```

The cloud overlay already uses `ghcr.io/vedarthamsaaket/video-streaming-platform`. To use ECR instead,
run:

```bash
kubectl -n streamvault set image deploy/streamvault-app api="$ECR_URL:1.0.0"
```

## Remote state

The repository ships `backend.tf.example`. Create an S3 bucket with versioning and a DynamoDB table
for locking, then copy the example to `backend.tf` and run `terraform init -migrate-state`.

## Cost warning

The default plan creates a three node EKS cluster, three NAT gateways and an EKS control plane. That
is not free. Destroy it after the review:

```bash
terraform destroy
```

## Validation in CI

The `terraform` job in `.github/workflows/ci.yml` runs:

```bash
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
```

It never plans or applies, so CI needs no AWS credentials.
