## WebRTC Signaling Server (SparkShare Backend)

A lightweight WebSocket signaling server with Express, IPv4/IPv6 detection, simple network-based rooming, and a small stats dashboard (Chart.js) backed by SQLite.

### Important note (intent and scope)
- This repository is open-sourced to increase transparency and trust for SparkShare.
- It is not intended or supported for third-party deployment. Use at your own risk; no guarantees or support are provided.
- This codebase is the only backend of SparkShare and represents the currently deployed official version.
- Some production infrastructure (e.g., reverse proxy, TLS termination, monitoring) is internal and not included here.

### Features
- **WebSocket signaling**: offer, answer, candidate are relayed between peers
- **Peer discovery on the network**: grouping by client IP (IPv6 /64 and IPv4 /24)
- **Heartbeat & cleanup**: ping/pong with timeout
- **Dashboard**: overview of daily transfers/answers (Chart.js), optional JSON API
- **Persistence**: SQLite (better-sqlite3) under `data/userStats.db`
- **Docker support**: multi-arch build, persistent volume for `data/`

### Project structure (excerpt)
```
backend.js           # Express + WebSocket server, routing, signaling
dashboard.js         # Dashboard route (HTML + /dashboard/api)
database.js          # SQLite setup (daily_stats), tracking & queries
public/              # Static assets (for dashboard)
dockerfile           # Node 20-alpine, SQLite build deps
docker-compose.yml   # Example deployment (behind reverse proxy)
```


