# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities to security@yourdomain.com.

We aim to respond to security reports within 48 hours.

## Security Measures

- Local-first by default: no canvas data leaves the browser unless the host
  wires server-side persistence.
- See `docs/API.md` for the optional backend's auth model.

## Known dev-only advisories

`npm audit` reports moderate advisories in the **development toolchain**
(vite/vitest/esbuild: dev-server request handling and test-mock path
traversal). They do not affect the production bundle (`dist/`) and are fixed
only by major toolchain upgrades; they will be addressed with the next Vite
major. Production dependencies audit clean (`npm audit --omit=dev` → 0).

### Authentication
- JWT-based authentication with configurable expiration
- Role-based access control (RBAC)
- Secure password hashing (bcrypt)

### API Security
- CORS configuration
- Rate limiting
- Input validation (Pydantic)
- SQL injection prevention (SQLAlchemy ORM)

### Data Protection
- Encryption at rest (RDS, S3)
- Encryption in transit (TLS 1.3)
- PII redaction in logs
- Secure credential storage (AWS Secrets Manager)

### Infrastructure
- VPC isolation
- Security groups
- Private subnets for databases
- Network policies in Kubernetes

### Dependencies
- Regular dependency updates
- Automated vulnerability scanning (Dependabot)
- License compliance checks

## Security Checklist

- [ ] Enable authentication in production
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Use strong JWT secrets
- [ ] Enable audit logging
- [ ] Configure backup encryption
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
