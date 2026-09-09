# fieldlog-platform

Infrastructure for a shift-tracking app, built as a learning project.

## Current state
- Terraform remote state in S3 with DynamoDB locking
- VPC with two public subnets across two availability zones

## Planned
Docker, Ansible provisioning, GitHub Actions CI/CD, Kubernetes.

## Notes
`infra/bootstrap/` creates the state backend and runs on local state —
it can't store state in the bucket it creates. Applied manually.
