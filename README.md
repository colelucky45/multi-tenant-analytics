# Multi-Tenant System Health & Observability Dashboard

A secure, multi-tenant observability platform for monitoring system health across distributed services.

## Features
- Metrics ingestion via HTTP API
- Role-based access control (RBAC)
- Multi-tenant data isolation (database-level RLS)
- Real-time dashboards
- Threshold-based alerting
- Complete Infrastructure as Code (Terraform)

## Tech Stack
- **Backend:** Node.js/Express
- **Database:** PostgreSQL with Row-Level Security
- **Infrastructure:** AWS (VPC, RDS, EC2, ALB)
- **IaC:** Terraform
- **Frontend:** React (planned)

## Getting Started
See `docs/DEPLOYMENT.md` for setup instructions.