FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 bonza && \
    adduser --system --uid 1001 bonza

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src/backend ./src/backend
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

USER bonza
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/backend/index.js"]
