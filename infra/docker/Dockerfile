FROM node:24.19.0-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

FROM build AS workspace-dependencies
RUN pnpm --filter @oneday/auth build \
 && pnpm --filter @oneday/events build \
 && pnpm --filter @oneday/session-client build \
 && pnpm --filter @oneday/ui build

FROM workspace-dependencies AS api
RUN pnpm --filter @oneday/api build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]

FROM workspace-dependencies AS worker
RUN pnpm --filter @oneday/worker build

ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "apps/worker/dist/index.js"]

FROM workspace-dependencies AS human-pilot
ENV NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3200
ENV API_BASE_URL=http://api:3001
RUN pnpm --filter @oneday/api build && pnpm --filter @oneday/worker build && pnpm --filter @oneday/consumer-web build && pnpm --filter @oneday/employee-web build && pnpm --filter @oneday/management-web build && pnpm --filter @oneday/platform-web build

ENV NODE_ENV=production
EXPOSE 3001 3002 3201 3202 3203 3204
CMD ["sh"]
