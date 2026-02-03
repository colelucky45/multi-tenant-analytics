# System Architecture

## High-Level Overview
```
Client Applications (send metrics via POST /v1/metrics)
            ↓ (X-Org-Key header)
Application Load Balancer (AWS ALB)
            ↓
Auto Scaling Group (2-5 EC2 instances)
Running: Node.js/Express API Server
            ↓
RDS PostgreSQL (Multi-AZ)
- organizations (tenants)
- users (with RBAC)
- metrics (time-series)
- Row-Level Security (RLS) for tenant isolation
```

## Key Design Decisions

### Multi-Tenancy
- Each organization is a separate tenant
- Database-level isolation via PostgreSQL RLS

### Authentication
- **Service-to-Service:** X-Org-Key header
- **User Dashboard:** JWT tokens