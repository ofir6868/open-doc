# ---- Build stage: install everything and build the server bundle ----
FROM node:20-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx nx build server
# The webpack bundle externalises node_modules, so keep only production deps.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TEMPLATE_DIR=/data/templates \
    SCHEMA_CACHE_TTL=60

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/server/dist ./
COPY --from=build /repo/config ./config

# Persisted template store (mounted as a volume by docker-compose).
RUN mkdir -p /data/templates
VOLUME ["/data/templates"]

EXPOSE 3000
CMD ["node", "main.js"]
