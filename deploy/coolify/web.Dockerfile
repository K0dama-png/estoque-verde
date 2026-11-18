FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY mobile/package.json mobile/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY mobile/ ./
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV CI=1
ENV EXPO_NO_TELEMETRY=1
RUN case "$EXPO_PUBLIC_API_URL" in https://*) ;; *) echo "Configure EXPO_PUBLIC_API_URL com a URL publica HTTPS da API, terminando em /api." >&2; exit 1 ;; esac
RUN pnpm exec expo export --platform web --output-dir dist

FROM nginx:stable-alpine AS production
COPY deploy/coolify/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

