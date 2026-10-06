.PHONY: help install dev build test lint clean docker-build docker-run k8s-deploy

# Default target
help:
	@echo "Available targets:"
	@echo "  install      - Install all dependencies"
	@echo "  dev          - Start development servers"
	@echo "  build        - Build for production"
	@echo "  test         - Run all tests"
	@echo "  lint         - Run linters"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run with Docker Compose"
	@echo "  k8s-deploy   - Deploy to Kubernetes"

# Install dependencies
install:
	@echo "Installing frontend dependencies..."
	npm install
	@echo "Installing backend dependencies..."
	cd server && pip install -r requirements.txt

# Development
dev:
	@echo "Starting development servers..."
	@make -j2 dev-frontend dev-backend

dev-frontend:
	npm run dev

dev-backend:
	cd server && uvicorn main:app --reload --port 8000

# Build
build:
	@echo "Building frontend..."
	npm run build
	@echo "Building backend..."
	cd server && python -m compileall .

# Test
test:
	@echo "Running frontend tests..."
	npm test -- --run
	@echo "Running backend tests..."
	cd server && pytest tests/ -v

# Lint
lint:
	@echo "Linting frontend..."
	npm run lint
	@echo "Linting backend..."
	cd server && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# Clean
clean:
	rm -rf dist/
	rm -rf node_modules/
	rm -rf server/__pycache__/
	rm -rf server/**/__pycache__/
	rm -rf .pytest_cache/
	rm -rf coverage/

# Docker
docker-build:
	docker build -t agentic-cx-designer:latest .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Kubernetes
k8s-deploy:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/secrets.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/deployment.yaml
	kubectl apply -f k8s/service.yaml
	kubectl apply -f k8s/ingress.yaml
	kubectl apply -f k8s/hpa.yaml

k8s-delete:
	kubectl delete -f k8s/

k8s-status:
	kubectl get pods -l app=agentic-cx-designer
	kubectl get svc -l app=agentic-cx-designer
	kubectl get ingress -l app=agentic-cx-designer

# Database
db-migrate:
	cd server && alembic upgrade head

db-rollback:
	cd server && alembic downgrade -1

# Production
prod: build
	@echo "Starting production server..."
	cd server && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
