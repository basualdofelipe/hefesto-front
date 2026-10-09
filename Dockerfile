# Stage 1: install dependencies (dev dependencies needed for next build).
FROM node:24-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build the standalone server. NEXT_PUBLIC_* values are inlined at
# build time, so they are build args; changing one requires a rebuild.
FROM node:24-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DEMO_LOGIN_ENABLED
ARG NEXT_PUBLIC_DEMO_EMAIL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_DEMO_LOGIN_ENABLED=$NEXT_PUBLIC_DEMO_LOGIN_ENABLED \
    NEXT_PUBLIC_DEMO_EMAIL=$NEXT_PUBLIC_DEMO_EMAIL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Fail fast: branding.ts falls back with `??`, so an empty build arg would
# silently ship an empty app name instead of the default.
RUN fail() { echo "Invalid build arg $1: $2" >&2; exit 1; }; \
    [ -n "$NEXT_PUBLIC_API_URL" ] || fail NEXT_PUBLIC_API_URL 'must not be empty'; \
    [ -n "$NEXT_PUBLIC_DEMO_LOGIN_ENABLED" ] || fail NEXT_PUBLIC_DEMO_LOGIN_ENABLED 'must not be empty'; \
    [ -n "$NEXT_PUBLIC_DEMO_EMAIL" ] || fail NEXT_PUBLIC_DEMO_EMAIL 'must not be empty'; \
    [ -n "$NEXT_PUBLIC_APP_NAME" ] || fail NEXT_PUBLIC_APP_NAME 'must not be empty'; \
    [ -n "$NEXT_PUBLIC_CONTACT_EMAIL" ] || fail NEXT_PUBLIC_CONTACT_EMAIL 'must not be empty'; \
    case "$NEXT_PUBLIC_DEMO_LOGIN_ENABLED" in \
      true|false) ;; \
      *) fail NEXT_PUBLIC_DEMO_LOGIN_ENABLED "must be 'true' or 'false', got '$NEXT_PUBLIC_DEMO_LOGIN_ENABLED'" ;; \
    esac
RUN npm run build

# Stage 3: runtime image. Secrets (AUTH_SECRET, Google credentials) and
# API_INTERNAL_URL are supplied by the container environment, never baked in.
FROM node:24-alpine AS runner
WORKDIR /app
# Docker sets HOSTNAME to the container id and server.js binds to it.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
# node-owned: Next writes .next/cache at runtime.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
