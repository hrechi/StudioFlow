# ReFrame — production image (Next.js standalone server).
# Used by docker-compose.yml: `docker compose up --build`.

FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# 1. Dependencies (cached until package*.json changes)
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# 2a. Tools: source + full node_modules, no Next build. Used by the `seed` service (tsx scripts),
#     so `docker compose up --build` runs only ONE `next build` (two in parallel run out of memory).
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 2b. Build
FROM base AS builder
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_OUTPUT_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN NEXT_DEPLOYMENT_ID="${NEXT_DEPLOYMENT_ID:-$(node -p 'require("node:crypto").randomUUID()')}" npm run build

# 3. Runtime: only the traced server files, no source and no dev dependencies
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
