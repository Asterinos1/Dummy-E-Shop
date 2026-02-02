# Use a lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package definition first (caching layer)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the port defined in docker-compose
EXPOSE 5000

# Start the application
CMD ["node", "src/index.js"]