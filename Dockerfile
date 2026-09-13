# ---------- 1) build the React client ----------
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Same-origin default: the server serves the API under /api on the same
# domain as the built client, so a relative base URL needs no configuring.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- 2) install server production deps ----------
FROM node:20-alpine AS server-deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---------- 3) final runtime image ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/ ./
COPY --from=client-build /app/client/dist ./public

EXPOSE 4000
CMD ["node", "src/index.js"]
