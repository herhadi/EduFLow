FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
RUN npm run prisma:generate --workspace backend
RUN npm run build --workspace backend

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "apps/backend/dist/src/main.js"]
