# Multi-stage build: build with Node, serve with Nginx
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --progress=false

# Copy source and build
COPY . .
RUN npm run build

# -------- Serve static build with Nginx --------
FROM nginx:1.27-alpine

# Nginx config for Vite SPA (history API fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Simple healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
