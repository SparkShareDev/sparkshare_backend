FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

# Install SQLite dependencies
RUN apk add --no-cache python3 make g++ sqlite sqlite-dev

# Install app dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Ensure writable data directory (simplified permissions as requested)
RUN mkdir -p data && chmod -R 777 data

EXPOSE 8080

CMD [ "node", "backend.js" ]

# Production command (Version + latest):
# docker buildx build --platform linux/amd64,linux/arm64 -t johannbuild/spark-share_backend:1.0.1 -t johannbuild/spark-share_backend:latest . --push

# Staging command (Version + latest):
# docker buildx build --platform linux/amd64,linux/arm64 -t johannbuild/spark-share_backend_staging:1.0.1 -t johannbuild/spark-share_backend_staging:latest . --push