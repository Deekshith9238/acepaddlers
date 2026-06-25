# Build context must be the repo root (pnpm workspace):
#   docker build --platform linux/amd64 -f artifacts/api-server/Dockerfile -t acepaddlers-api .
# syntax=docker/dockerfile:1

FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Bring the installed workspace (incl. native deps like sharp) + the built bundle.
COPY --from=build /app ./
EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
