# Use smaller base image and optimized multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app

# Configure npm for better reliability
ENV NPM_CONFIG_FETCH_TIMEOUT=300000
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production --no-audit --silent

# Copy source and build
COPY . .
RUN npm run build

# -------- Production stage with Nginx --------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 9080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:9080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
