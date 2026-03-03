FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN npm ci

# Build shared types
FROM base AS build-shared
COPY packages/shared/ packages/shared/
COPY tsconfig.base.json ./

# Build frontend
FROM build-shared AS build-frontend
COPY packages/frontend/ packages/frontend/
ENV VITE_BASE_PATH=/
RUN npm run build --workspace=packages/frontend

# Build backend
FROM build-shared AS build-backend
COPY packages/backend/ packages/backend/
RUN npm run build --workspace=packages/backend

# Production image
FROM node:20-slim AS production
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN npm ci --omit=dev

COPY packages/shared/ packages/shared/
COPY --from=build-frontend /app/packages/frontend/dist packages/frontend/dist
COPY --from=build-backend /app/packages/backend/dist packages/backend/dist

ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=packages/frontend/dist
ENV DATABASE_PATH=/data/ganttlet.db

EXPOSE 3000
VOLUME /data

CMD ["node", "packages/backend/dist/index.js"]
