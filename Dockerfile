# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy built frontend
COPY --from=frontend-builder /app/dist ./frontend/dist

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/src/db/schema.ts ./backend/src/db/schema.ts

# Copy backend source for drizzle
COPY backend/drizzle.config.ts ./backend/
COPY backend/src/db ./backend/src/db

# Create data directory
RUN mkdir -p /app/backend/data

# Environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start backend
WORKDIR /app/backend
CMD ["node", "dist/index.js"]