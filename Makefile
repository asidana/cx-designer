.PHONY: help install dev build test lint clean docker-build docker-run docker-stop docker-logs

# Default target
help:
	@echo "Available targets:"
	@echo "  install      - Install dependencies (npm ci)"
	@echo "  dev          - Start the Vite dev server"
	@echo "  build        - Production build (tsc + vite)"
	@echo "  test         - Run the test suite (non-watch)"
	@echo "  lint         - ESLint"
	@echo "  clean        - Remove build artifacts and node_modules"
	@echo "  docker-build - Build the static canvas image"
	@echo "  docker-run   - Run with Docker Compose"
	@echo "  docker-stop  - Stop Docker Compose"
	@echo "  docker-logs  - Follow container logs"
# The optional FastAPI backend (server/) is managed separately; see
# docs/API.md. k8s/ and terraform/ are legacy platform infrastructure
# kept for reference — not part of the canvas release.

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

clean:
	rm -rf dist/ node_modules/ server/__pycache__/ .pytest_cache/ coverage/

docker-build:
	docker build -t agentic-cx-designer:latest .

docker-run:
	docker compose up -d

docker-stop:
	docker compose down

docker-logs:
	docker compose logs -f
