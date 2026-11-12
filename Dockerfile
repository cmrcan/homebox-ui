# UI5's static assets are architecture independent; compile once on the build host.
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY ui5.yaml tsconfig.json ./
COPY webapp ./webapp
COPY scripts ./scripts
RUN npm run build

FROM nginx:1.28-alpine
ENV HOMEBOX_UPSTREAM=http://homebox:7745
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/healthz || exit 1
