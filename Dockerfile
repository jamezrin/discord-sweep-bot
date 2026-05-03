FROM node:24-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY src ./src
RUN pnpm run build

FROM node:24-alpine
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

COPY --from=base /app/dist ./dist

USER node

CMD ["node", "dist/index.js"]
