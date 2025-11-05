FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci)
RUN npm install

# Copy source code
COPY . .

# No build step needed - working-server.js is already JavaScript
# EXPOSE port (Railway sets PORT automatically)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
