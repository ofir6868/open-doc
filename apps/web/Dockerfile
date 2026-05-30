# ---- Build stage: produce the static web bundle ----
FROM node:20-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx vite build --config apps/web/vite.config.ts

# ---- Runtime stage: serve static files + proxy /api to the server ----
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
