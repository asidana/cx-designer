# Agentic CX Designer — static image.
#
# The canvas is fully client-side (local-first storage), so the image is
# just the Vite build served by nginx. The optional FastAPI backend in
# server/ is not part of this image; deploy it separately if a host needs
# server-side persistence.

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
