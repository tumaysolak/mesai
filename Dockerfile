FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
# The Railway volume is mounted at /data as root at runtime, so the process stays
# root to keep write access. The container runs one Node service and no shell tools.
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server/index.js"]
