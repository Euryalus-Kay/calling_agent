FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./
RUN npm install

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/server.js"]
