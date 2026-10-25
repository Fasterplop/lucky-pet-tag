# Imagen de producción para Coolify (build pack «Dockerfile»).
# Existe para fijar Node en la versión exacta: con Nixpacks solo se elige la
# mayor (22) y Coolify instalaba la 22.11.0, sin el arreglo de CVE-2026-111497
# (Brotli, corregido en 22.23.4). Para subir de Node, cambiar las dos líneas FROM.
FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Coolify pasa las variables de entorno como build args: se declaran solo en
# esta etapa para que `next build` las vea igual que con Nixpacks (las
# NEXT_PUBLIC_* quedan incrustadas en el bundle) sin que el resto quede en la
# imagen final (en runtime Coolify las inyecta al contenedor).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL
ARG NEXT_PUBLIC_OWNER_PORTAL_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG SHOPIFY_STORE_DOMAIN
ARG SHOPIFY_CLIENT_ID
ARG SHOPIFY_CLIENT_SECRET
ARG SHOPIFY_WEBHOOK_SECRET
ARG RESEND_API_KEY
ARG RESEND_FROM_EMAIL
RUN npm run build

FROM node:22.23.4-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# curl para el healthcheck de Coolify: la imagen slim no lo trae
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
# Todo /app, con devDependencies, como dejaba Nixpacks (next.config.ts se lee al arrancar)
COPY --from=build /app ./
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
