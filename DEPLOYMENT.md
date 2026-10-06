# Deployment Guide

## Docker Compose (Development)

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Kubernetes (Production)

### Prerequisites

- kubectl configured
- Helm (optional)
- Ingress controller (nginx)
- cert-manager (for TLS)

### Deploy

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl apply -f k8s/secrets.yaml

# Create config
kubectl apply -f k8s/configmap.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

### Verify

```bash
kubectl get pods -n agentic-cx
kubectl get svc -n agentic-cx
kubectl get ingress -n agentic-cx
```

## Terraform (AWS)

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Redis connection |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `JWT_SECRET` | JWT signing secret |
| `CORS_ORIGINS` | Allowed CORS origins |

## Scaling

- HPA: 3-10 replicas based on CPU/memory
- Database: RDS with read replicas
- Cache: Redis cluster mode
- CDN: CloudFront for static assets

## Monitoring

- Prometheus metrics: `/metrics`
- Health check: `/health`
- Grafana dashboards: Import from `monitoring/grafana/`

## Backup

- RDS: Automated daily backups
- Redis: Snapshot every 6 hours
- Flows: Export to S3
