# Backend image. Build from the repository root, because the API needs the shared packages:
#   docker build -f apps/backend/Dockerfile -t csms-backend .
# docker-compose.yml does exactly that.

ARG NODE_VERSION=24

# ---- build: install everything, compile, then cut a production-only copy of the API -----------------------------
FROM node:${NODE_VERSION}-slim AS build

# the version in package.json "packageManager"
ARG PNPM_VERSION=12.15.0
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /repo

# 1. manifests first: this layer (and the install below) is reused until a dependency changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/validator/package.json packages/validator/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter "backend..."

# 2. sources, then build backend and the packages it imports, in dependency order
COPY packages/shared packages/shared
COPY packages/validator packages/validator
COPY apps/backend apps/backend
RUN pnpm --filter "backend..." run build

# 3. what the API needs at run time: production dependencies only, with the built shared packages inside
RUN pnpm --filter backend deploy --prod /out

# ---- runtime ---------------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/drizzle ./drizzle
COPY --from=build /out/package.json ./package.json

# The WhatsApp session lives here. It is created and owned by `node` in the image, so a named volume mounted on it
# starts out writable by the non-root user.
RUN mkdir -p /app/.baileys_auth && chown node:node /app/.baileys_auth

USER node
EXPOSE 3000

# Migrations and the seed are separate commands on the same image, see docker-compose.yml and docs/deployment.md:
#   node dist/database/migrate.js
#   node dist/database/seed.js
CMD ["node", "dist/main"]
