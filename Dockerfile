FROM node:18-alpine

WORKDIR /app

# Copy dependency definitions
COPY backend/package.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy application files (frontend and backend)
COPY . .

# Expose backend server port
EXPOSE 3000

# Start server
CMD ["node", "backend/server.js"]