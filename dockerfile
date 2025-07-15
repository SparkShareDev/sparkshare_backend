FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install SQLite dependencies
RUN apk add --no-cache python3 make g++ sqlite sqlite-dev

# Install app dependencies
COPY package*.json ./
RUN npm install

# CRITICAL: Rebuild native modules for the target architecture
# RUN npm rebuild better-sqlite3 --build-from-source


# Bundle app source
COPY . .

# Create data directory for SQLite and views directory for templates
RUN mkdir -p data && chmod 777 data
RUN mkdir -p views && chmod 777 views

# Enable IPv6 in Docker
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

EXPOSE 8080

CMD [ "node", "backend.js" ]


# deploy
# docker buildx build --platform linux/amd64,linux/arm64 -t johannbuild/spark-share_backend:latest . --push
