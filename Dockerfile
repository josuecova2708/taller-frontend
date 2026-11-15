# Imagen del dashboard web para Azure Container Apps.
#
# NEXT_PUBLIC_API_URL se incrusta en el código del navegador durante el build,
# así que la imagen se construye DESPUÉS de conocer la URL del backend:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://<backend>/api -t <usuario>/taller-frontend:v1 .

# ---------- Etapa 1: compilación ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Etapa 2: ejecución ----------
FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# server.js no sirve public/ ni .next/static por sí solo: se copian a su lado.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3001
CMD ["node", "server.js"]
