FROM node:24.19.0-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

FROM build AS api
RUN pnpm --filter @oneday/api build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]

FROM build AS worker
RUN pnpm --filter @oneday/worker build

ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "apps/worker/dist/index.js"]
