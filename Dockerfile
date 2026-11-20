# Image de production (D-138 (3)) : construction, puis image d'exécution node:22, utilisateur non root.

# 1. Construction : dépendances complètes, npm run build (moteur et API par tsc, web par vite).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY e2e/package.json e2e/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages packages
RUN npm run build

# 2. Exécution : dépendances d'exécution de l'API seules, code compilé, migrations, web compilé.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY e2e/package.json e2e/
RUN npm ci --omit=dev --no-audit --no-fund -w @planersource/api && npm cache clean --force
COPY --from=build /app/packages/engine/dist packages/engine/dist
COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/web/dist packages/web/dist
COPY packages/api/migrations packages/api/migrations
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "--conditions=planersource-dist", "packages/api/dist/server.js"]
