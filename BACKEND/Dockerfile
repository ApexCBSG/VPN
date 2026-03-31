# Build on Node 20 Alpine (Leanest for Production)
FROM node:20.18-alpine

# Set working directory
WORKDIR /app

# Ensure we have the necessary dependencies for npm install (e.g. for native modules like bcryptjs)
RUN apk add --no-cache python3 make g++

# Copy package files first to leverage Docker cache for layers
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
