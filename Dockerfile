# Multi-stage build for the Via Relayer

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# Create logs directory (used by logger)
RUN mkdir -p /app/logs

# No ports exposed; the relayer runs as a background worker
CMD ["node", "dist/main.js"]


