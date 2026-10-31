# Web image: the built dashboard served by nginx, which also forwards /api to the backend.
# Build from the repository root:
#   docker build -f apps/web/Dockerfile -t csms-web .

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS build

ARG PNPM_VERSION=12.15.0
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/validator/package.json packages/validator/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter "web..."

COPY packages packages
COPY apps/web apps/web

# Vite reads this at BUILD time, so changing it means building the image again.
# "/api" (same origin as the page) works because nginx forwards /api to the backend: no CORS, no cross-site cookie.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter "web..." run build

# ---- runtime ---------------------------------------------------------------------------------------------------
FROM nginx:stable-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80
