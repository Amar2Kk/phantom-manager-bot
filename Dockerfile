# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# Set working directory
WORKDIR /app

# Copy package files and prisma files FIRST
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client (set dummy DATABASE_URL for build)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:22-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma files BEFORE installing (needed for generation)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install ALL dependencies temporarily (needed for prisma)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client in production stage (set dummy DATABASE_URL for build)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN pnpm prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Set environment to production
ENV NODE_ENV=production

# Create a startup script
RUN echo '#!/bin/sh\n\
echo "Running database migrations..."\n\
pnpm prisma migrate deploy\n\
echo "Starting bot..."\n\
node dist/index.js' > /app/start.sh && chmod +x /app/start.sh

# Run the startup script
CMD ["/app/start.sh"]

