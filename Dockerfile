# Agentic CX Designer — Dockerfile

# Frontend build stage
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Backend build stage
FROM python:3.11-slim AS backend-builder

WORKDIR /app/server

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ .

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install Python for backend
RUN apk add --no-cache python3 py3-pip

# Copy frontend build
COPY --from=frontend-builder /app/dist ./dist

# Copy backend
COPY --from=backend-builder /app/server ./server

# Install backend dependencies
COPY server/requirements.txt ./server/
RUN pip3 install --no-cache-dir -r ./server/requirements.txt

# Install serve for frontend
RUN npm install -g serve

# Expose ports
EXPOSE 3000 8000

# Start script
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
