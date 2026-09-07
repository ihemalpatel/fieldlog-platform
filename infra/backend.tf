terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "fieldlog-tfstate-hp-2026"
    key            = "global/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "fieldlog-tflock"
    use_lockfile   = true
    encrypt        = true
  }
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      Project   = "fieldlog"
      ManagedBy = "terraform"
    }
  }
}