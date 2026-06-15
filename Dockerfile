# Single-image deploy: builds the SPA, then runs the unified Express server.
FROM node:22-slim AS build
WORKDIR /app

# Install all dependencies (server + frontend) and build the client.
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm install && npm install --prefix frontend
COPY . .
RUN npm run build

# Trim the frontend dev dependencies for the runtime image.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY --from=build /app/frontend/dist ./frontend/dist

EXPOSE 5001
CMD ["node", "server.js"]
