# Stage 1: Build Process
FROM node:20.18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Environment argument for the API URL (baked in at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the production application
RUN npm run build

# Stage 2: Production Server
FROM node:20.18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose Next.js port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "run", "start"]
